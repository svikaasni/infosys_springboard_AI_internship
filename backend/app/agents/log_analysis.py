"""
Log Analysis Agent
------------------
Parses stack traces and raw error logs into structured information.

Extracts:
- exception / error type
- failure file
- failure line
- failure function / method
- concise failure summary

Supported formats:
- Python
- JavaScript / Node.js / TypeScript
- Java
- C / C++
- Go
- Rust
- Generic application logs

The agent is intentionally lightweight and deterministic so that it can
work even when an external LLM is unavailable.
"""

import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class LogAnalysisResult:
    exception_type: Optional[str]
    failure_file: Optional[str]
    failure_line: Optional[str]
    failure_function: Optional[str]
    summary: str


# -------------------------------------------------------------------
# Python
# -------------------------------------------------------------------

PY_FRAME_RE = re.compile(
    r'File\s+"([^"]+)",\s+line\s+(\d+),\s+in\s+([^\n]+)',
    re.IGNORECASE,
)

PY_EXC_RE = re.compile(
    r"^\s*([\w.]+(?:Error|Exception|Warning|Interrupt))"
    r"(?:\s*:\s*(.*))?$",
    re.MULTILINE,
)


# -------------------------------------------------------------------
# JavaScript / Node / TypeScript
# -------------------------------------------------------------------

JS_FRAME_WITH_FUNCTION_RE = re.compile(
    r"at\s+([^\s(]+)\s+\((.+?\.(?:js|jsx|ts|tsx|mjs|cjs)):(\d+):(\d+)\)",
    re.IGNORECASE,
)

JS_FRAME_NO_FUNCTION_RE = re.compile(
    r"at\s+(.+?\.(?:js|jsx|ts|tsx|mjs|cjs)):(\d+):(\d+)",
    re.IGNORECASE,
)

JS_EXC_RE = re.compile(
    r"^\s*([\w.]+(?:Error|Exception))\s*:\s*(.*)$",
    re.MULTILINE,
)


# -------------------------------------------------------------------
# Java
# -------------------------------------------------------------------

JAVA_FRAME_RE = re.compile(
    r"at\s+([\w.$<>]+)\(([^():]+\.java):(\d+)\)"
)

JAVA_EXC_RE = re.compile(
    r"^\s*(?:Exception in thread\s+\"[^\"]+\"\s+)?"
    r"([\w.$]+(?:Exception|Error))"
    r"(?:\s*:\s*(.*))?$",
    re.MULTILINE,
)


# -------------------------------------------------------------------
# C / C++
# Examples:
# main.cpp:42
# src/main.cpp:42:10
# -------------------------------------------------------------------

CPP_LOCATION_RE = re.compile(
    r"([A-Za-z0-9_./\\-]+\.(?:c|cc|cpp|cxx|h|hpp)):(\d+)(?::\d+)?",
    re.IGNORECASE,
)

CPP_ERROR_RE = re.compile(
    r"(segmentation fault|segfault|"
    r"std::[\w:]+|"
    r"runtime_error|"
    r"logic_error|"
    r"assertion failed|"
    r"access violation)",
    re.IGNORECASE,
)


# -------------------------------------------------------------------
# Go
# Examples:
# /app/main.go:27
# panic: runtime error: integer divide by zero
# -------------------------------------------------------------------

GO_LOCATION_RE = re.compile(
    r"([A-Za-z0-9_./\\-]+\.go):(\d+)"
)

GO_PANIC_RE = re.compile(
    r"^\s*(panic|fatal error)\s*:\s*(.+)$",
    re.MULTILINE | re.IGNORECASE,
)

GO_FUNCTION_RE = re.compile(
    r"^\s*([\w./()*-]+)\([^)]*\)\s*$",
    re.MULTILINE,
)


# -------------------------------------------------------------------
# Rust
# Examples:
# src/main.rs:10:5
# thread 'main' panicked at ...
# -------------------------------------------------------------------

RUST_LOCATION_RE = re.compile(
    r"([A-Za-z0-9_./\\-]+\.rs):(\d+)(?::\d+)?"
)

RUST_PANIC_RE = re.compile(
    r"(?:thread\s+'[^']+'\s+)?panicked\s+at\s+['\"]?([^'\"]+)",
    re.IGNORECASE,
)


# -------------------------------------------------------------------
# Generic helpers
# -------------------------------------------------------------------

GENERIC_EXCEPTION_RE = re.compile(
    r"\b("
    r"[\w.]+Error|"
    r"[\w.]+Exception|"
    r"SegmentationFault|"
    r"Segmentation Fault|"
    r"AccessViolation|"
    r"AssertionError|"
    r"panic|"
    r"fatal error"
    r")\b",
    re.IGNORECASE,
)

GENERIC_FILE_RE = re.compile(
    r"([A-Za-z0-9_./\\-]+\."
    r"(?:py|java|js|jsx|ts|tsx|cpp|cc|cxx|c|h|hpp|go|rs))"
    r"(?::|\s+line\s+)(\d+)",
    re.IGNORECASE,
)


class LogAnalysisAgent:
    name = "Log Analysis Agent"

    def run(self, stack_trace: Optional[str]) -> LogAnalysisResult:

        # -----------------------------------------------------------
        # No log supplied
        # -----------------------------------------------------------

        if not stack_trace or not stack_trace.strip():
            return LogAnalysisResult(
                exception_type=None,
                failure_file=None,
                failure_line=None,
                failure_function=None,
                summary=(
                    "No stack trace or error log was provided. "
                    "Failure-point extraction could not be performed."
                ),
            )

        trace = stack_trace.strip()

        # Normalize Windows line endings
        trace = trace.replace("\r\n", "\n").replace("\r", "\n")

        # -----------------------------------------------------------
        # Python
        # -----------------------------------------------------------

        python_frames = PY_FRAME_RE.findall(trace)

        if python_frames:
            # Last Python traceback frame is normally closest
            # to the actual failure.
            file_, line, function = python_frames[-1]

            exception_match = PY_EXC_RE.search(trace)

            exception_type = (
                exception_match.group(1)
                if exception_match
                else "PythonError"
            )

            message = ""
            if exception_match and exception_match.group(2):
                message = exception_match.group(2).strip()

            summary = (
                f"{exception_type} detected in "
                f"{function.strip()}() at {file_}:{line}."
            )

            if message:
                summary += f" Error: {message[:180]}"

            return LogAnalysisResult(
                exception_type=exception_type,
                failure_file=file_,
                failure_line=line,
                failure_function=function.strip(),
                summary=summary,
            )

        # -----------------------------------------------------------
        # JavaScript / Node / TypeScript
        # -----------------------------------------------------------

        js_function_frames = JS_FRAME_WITH_FUNCTION_RE.findall(trace)

        if js_function_frames:
            function, file_, line, _column = js_function_frames[0]

            exception_match = JS_EXC_RE.search(trace)

            exception_type = (
                exception_match.group(1)
                if exception_match
                else "JavaScriptError"
            )

            message = ""
            if exception_match and exception_match.group(2):
                message = exception_match.group(2).strip()

            summary = (
                f"{exception_type} detected in "
                f"{function}() at {file_}:{line}."
            )

            if message:
                summary += f" Error: {message[:180]}"

            return LogAnalysisResult(
                exception_type=exception_type,
                failure_file=file_,
                failure_line=line,
                failure_function=function,
                summary=summary,
            )

        js_no_function_frames = JS_FRAME_NO_FUNCTION_RE.findall(trace)

        if js_no_function_frames:
            file_, line, _column = js_no_function_frames[0]

            exception_match = JS_EXC_RE.search(trace)

            exception_type = (
                exception_match.group(1)
                if exception_match
                else "JavaScriptError"
            )

            message = ""
            if exception_match and exception_match.group(2):
                message = exception_match.group(2).strip()

            summary = f"{exception_type} detected at {file_}:{line}."

            if message:
                summary += f" Error: {message[:180]}"

            return LogAnalysisResult(
                exception_type=exception_type,
                failure_file=file_,
                failure_line=line,
                failure_function=None,
                summary=summary,
            )

        # -----------------------------------------------------------
        # Java
        # -----------------------------------------------------------

        java_frames = JAVA_FRAME_RE.findall(trace)

        if java_frames:
            method, file_, line = java_frames[0]

            exception_match = JAVA_EXC_RE.search(trace)

            exception_type = (
                exception_match.group(1)
                if exception_match
                else "JavaException"
            )

            message = ""
            if exception_match and exception_match.group(2):
                message = exception_match.group(2).strip()

            summary = (
                f"{exception_type} detected at "
                f"{method} ({file_}:{line})."
            )

            if message:
                summary += f" Error: {message[:180]}"

            return LogAnalysisResult(
                exception_type=exception_type,
                failure_file=file_,
                failure_line=line,
                failure_function=method,
                summary=summary,
            )

        # -----------------------------------------------------------
        # Go
        # -----------------------------------------------------------

        go_location = GO_LOCATION_RE.search(trace)

        if go_location:
            file_, line = go_location.groups()

            panic_match = GO_PANIC_RE.search(trace)

            if panic_match:
                exception_type = panic_match.group(1).title()
                message = panic_match.group(2).strip()
            else:
                exception_type = "GoRuntimeError"
                message = ""

            function_match = GO_FUNCTION_RE.search(trace)

            function = (
                function_match.group(1)
                if function_match
                else None
            )

            summary = (
                f"{exception_type} detected at {file_}:{line}."
            )

            if function:
                summary += f" Probable function: {function}."

            if message:
                summary += f" Error: {message[:180]}"

            return LogAnalysisResult(
                exception_type=exception_type,
                failure_file=file_,
                failure_line=line,
                failure_function=function,
                summary=summary,
            )

        # -----------------------------------------------------------
        # Rust
        # -----------------------------------------------------------

        rust_location = RUST_LOCATION_RE.search(trace)

        if rust_location:
            file_, line = rust_location.groups()

            panic_match = RUST_PANIC_RE.search(trace)

            exception_type = "RustPanic"

            message = (
                panic_match.group(1).strip()
                if panic_match
                else ""
            )

            summary = f"{exception_type} detected at {file_}:{line}."

            if message:
                summary += f" Error: {message[:180]}"

            return LogAnalysisResult(
                exception_type=exception_type,
                failure_file=file_,
                failure_line=line,
                failure_function=None,
                summary=summary,
            )

        # -----------------------------------------------------------
        # C / C++
        # -----------------------------------------------------------

        cpp_location = CPP_LOCATION_RE.search(trace)

        if cpp_location:
            file_, line = cpp_location.groups()

            error_match = CPP_ERROR_RE.search(trace)

            exception_type = (
                error_match.group(1)
                if error_match
                else "NativeRuntimeError"
            )

            exception_type = exception_type.strip()

            summary = (
                f"{exception_type} detected near "
                f"{file_}:{line}."
            )

            return LogAnalysisResult(
                exception_type=exception_type,
                failure_file=file_,
                failure_line=line,
                failure_function=None,
                summary=summary,
            )

        # -----------------------------------------------------------
        # Generic file + line detection
        # -----------------------------------------------------------

        generic_location = GENERIC_FILE_RE.search(trace)

        generic_exception = GENERIC_EXCEPTION_RE.search(trace)

        if generic_location:
            file_, line = generic_location.groups()

            exception_type = (
                generic_exception.group(1)
                if generic_exception
                else "UnknownRuntimeError"
            )

            summary = (
                f"{exception_type} detected near "
                f"{file_}:{line}. "
                "The log format was only partially recognized."
            )

            return LogAnalysisResult(
                exception_type=exception_type,
                failure_file=file_,
                failure_line=line,
                failure_function=None,
                summary=summary,
            )

        # -----------------------------------------------------------
        # Generic exception detection
        # -----------------------------------------------------------

        if generic_exception:
            exception_type = generic_exception.group(1)

            relevant_line = self._find_relevant_error_line(
                trace,
                exception_type,
            )

            summary = (
                f"{exception_type} detected. "
                "A precise source-code failure location "
                "could not be extracted."
            )

            if relevant_line:
                summary += f" Log: {relevant_line[:180]}"

            return LogAnalysisResult(
                exception_type=exception_type,
                failure_file=None,
                failure_line=None,
                failure_function=None,
                summary=summary,
            )

        # -----------------------------------------------------------
        # Completely unknown log format
        # -----------------------------------------------------------

        first_useful_line = self._first_useful_line(trace)

        return LogAnalysisResult(
            exception_type=None,
            failure_file=None,
            failure_line=None,
            failure_function=None,
            summary=(
                "The log format was not recognized. "
                f"Most relevant log entry: "
                f"\"{first_useful_line[:200]}\""
            ),
        )

    # ---------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------

    @staticmethod
    def _first_useful_line(trace: str) -> str:
        """
        Returns the first non-empty log line.
        """

        for line in trace.splitlines():
            clean = line.strip()

            if clean:
                return clean

        return "No readable log content."

    @staticmethod
    def _find_relevant_error_line(
        trace: str,
        exception_type: str,
    ) -> Optional[str]:
        """
        Finds the line containing the detected exception.
        """

        exception_lower = exception_type.lower()

        for line in trace.splitlines():
            if exception_lower in line.lower():
                return line.strip()

        return None