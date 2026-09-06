"""Make an essential process failure fail the whole container (PID 1).

Supervisor normally stays alive even when every child has failed. A normal
queue-worker max-time/restart exit is expected and can restart independently.
"""
import os
import signal
import sys

from supervisor import childutils


while True:
    headers, payload = childutils.listener.wait(sys.stdin, sys.stdout)
    details = childutils.get_headers(payload)
    process = details.get("processname")
    failed = headers["eventname"] == "PROCESS_STATE_FATAL"
    if headers["eventname"] == "PROCESS_STATE_EXITED":
        failed = process in {"php-fpm", "nginx"} or details.get("expected") == "0"
    childutils.listener.ok(sys.stdout)
    if failed and process in {"php-fpm", "nginx", "queue-worker"}:
        print(f"[supervisor] Essential process {process} failed; stopping container.", file=sys.stderr, flush=True)
        # SIGKILL yields a nonzero status. SIGTERM would conceal the failure
        # because supervisord reports a successful exit after graceful shutdown.
        os.kill(os.getppid(), signal.SIGKILL)
