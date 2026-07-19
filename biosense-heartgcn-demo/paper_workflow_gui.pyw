from __future__ import annotations

import os
import queue
import shutil
import subprocess
import threading
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk


APP_DIR = Path(__file__).resolve().parent
TEMPLATE_PATH = APP_DIR / "START_PROCESS_PROMPT.md"


def build_prompt(paper_path: Path, work_folder: Path) -> str:
    return f"""Use the workflow and quality-gate template at:

{TEMPLATE_PATH}

Apply it to the selected research paper:

{paper_path}

Perform all work under:

{work_folder}

The template contains biomedical conduction-velocity details from an example paper. Treat those details only as examples. Read the selected paper completely and replace every paper-specific equation, threshold, assumption, dataset, Lean theorem, C++ function, and test case with material that genuinely applies to the selected paper. Do not carry over heart-specific content unless it is actually relevant.

Execute the complete process rather than stopping at a plan:

1. Read the paper and build paper-specific claim, issue, data-availability, and reproducibility ledgers.
2. Normalize its equations, algorithms, domains, units, assumptions, boundary cases, and central reproducible result.
3. Build and run the reusable Mathematica notebook/package, paper-specific audit, validation suite, figures/tables, and evidence exports.
4. Use Lean 4 selectively for meaningful exact proof obligations; pin Lean/Mathlib, prohibit proof placeholders, run lake build, and map formal claims to the paper and Mathematica model.
5. Freeze the verified model baseline, tool versions, source hashes, C++ API contract, deterministic reference vectors, and justified tolerance policy.
6. Implement the paper's central computational kernel in standalone C++ without unrelated GUI or integration layers unless they are essential.
7. Build and run Mathematica-derived differential tests, Lean-derived property tests, and boundary, invalid-input, robustness, and floating-point stress tests.
8. Run Parasoft C/C++test static analysis, applicable coding-standard checks, unit/runtime tests, and required coverage. If Parasoft cannot run, prepare the exact configuration and commands and report it as blocked; do not claim success.
9. Run the cross-language Mathematica-to-C++ equivalence audit and investigate systematic differences instead of weakening tolerances.
10. Produce the final traceability matrix and evidence report, clearly separating formally proved, symbolically verified, numerically validated, implementation-verified, unavailable, and blocked claims.

Use the smallest complete scope that reproduces the selected paper's central result. Do not make scientific, engineering, safety, or clinical claims beyond the evidence actually produced. Carry the work through implementation, builds, tests, audits, exports, and adversarial self-review. Report exact commands, artifacts, results, and unresolved limitations at the end.
"""


def validate_inputs(paper_text: str, work_text: str) -> tuple[Path, Path, str]:
    paper = Path(paper_text.strip()).expanduser().resolve()
    work_folder = Path(work_text.strip()).expanduser().resolve()

    if not TEMPLATE_PATH.is_file():
        raise ValueError(f"Workflow template not found:\n{TEMPLATE_PATH}")
    if not paper.is_file():
        raise ValueError("Choose an existing research-paper file.")
    if paper.suffix.lower() != ".pdf":
        raise ValueError("The selected research paper must be a PDF file.")
    if not work_folder.is_dir():
        raise ValueError("Choose an existing work folder.")
    if not os.access(work_folder, os.W_OK):
        raise ValueError("The selected work folder is not writable.")

    amp_executable = shutil.which("amp")
    if not amp_executable:
        fallback = Path.home() / ".amp" / "bin" / "amp.exe"
        amp_executable = str(fallback) if fallback.is_file() else None
    if not amp_executable:
        raise ValueError("Amp CLI was not found on PATH. Install or configure Amp first.")

    return paper, work_folder, amp_executable


class PaperWorkflowApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Research Paper Verification Workflow")
        self.root.geometry("940x700")
        self.root.minsize(760, 580)

        self.paper_var = tk.StringVar()
        self.work_var = tk.StringVar(value=str(APP_DIR))
        self.status_var = tk.StringVar(value="Choose a paper and work folder.")
        self.events: queue.Queue[tuple[str, object]] = queue.Queue()
        self.process: subprocess.Popen[str] | None = None
        self.stop_requested = False

        self._configure_style()
        self._build_ui()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self.root.after(100, self._drain_events)

    def _configure_style(self) -> None:
        style = ttk.Style(self.root)
        if "vista" in style.theme_names():
            style.theme_use("vista")
        style.configure("Title.TLabel", font=("Segoe UI", 20, "bold"))
        style.configure("Subtitle.TLabel", font=("Segoe UI", 10))
        style.configure("Field.TLabel", font=("Segoe UI", 10, "bold"))
        style.configure("Go.TButton", font=("Segoe UI", 10, "bold"), padding=(18, 8))

    def _build_ui(self) -> None:
        outer = ttk.Frame(self.root, padding=24)
        outer.pack(fill="both", expand=True)
        outer.columnconfigure(0, weight=1)
        outer.rowconfigure(4, weight=1)

        ttk.Label(outer, text="Paper → Mathematica → Lean → C++ → Parasoft", style="Title.TLabel").grid(
            row=0, column=0, sticky="w"
        )
        ttk.Label(
            outer,
            text="Select a research paper and output folder. Go starts the complete 10-step workflow in Amp.",
            style="Subtitle.TLabel",
        ).grid(row=1, column=0, sticky="w", pady=(4, 20))

        form = ttk.LabelFrame(outer, text="Workflow inputs", padding=16)
        form.grid(row=2, column=0, sticky="ew")
        form.columnconfigure(1, weight=1)

        ttk.Label(form, text="Research paper", style="Field.TLabel").grid(row=0, column=0, sticky="w", padx=(0, 12))
        ttk.Entry(form, textvariable=self.paper_var).grid(row=0, column=1, sticky="ew")
        ttk.Button(form, text="Browse…", command=self._choose_paper).grid(row=0, column=2, padx=(10, 0))

        ttk.Label(form, text="Work folder", style="Field.TLabel").grid(
            row=1, column=0, sticky="w", padx=(0, 12), pady=(12, 0)
        )
        ttk.Entry(form, textvariable=self.work_var).grid(row=1, column=1, sticky="ew", pady=(12, 0))
        ttk.Button(form, text="Browse…", command=self._choose_work_folder).grid(row=1, column=2, padx=(10, 0), pady=(12, 0))

        ttk.Label(form, text="Workflow template", style="Field.TLabel").grid(
            row=2, column=0, sticky="w", padx=(0, 12), pady=(12, 0)
        )
        template_entry = ttk.Entry(form)
        template_entry.insert(0, str(TEMPLATE_PATH))
        template_entry.configure(state="readonly")
        template_entry.grid(row=2, column=1, columnspan=2, sticky="ew", pady=(12, 0))

        controls = ttk.Frame(outer)
        controls.grid(row=3, column=0, sticky="ew", pady=16)
        self.go_button = ttk.Button(controls, text="Go", style="Go.TButton", command=self._start)
        self.go_button.pack(side="left")
        self.stop_button = ttk.Button(controls, text="Stop", command=self._stop, state="disabled")
        self.stop_button.pack(side="left", padx=(10, 0))
        ttk.Button(controls, text="Preview prompt", command=self._preview_prompt).pack(side="left", padx=(10, 0))
        self.progress = ttk.Progressbar(controls, mode="indeterminate", length=220)
        self.progress.pack(side="right")

        log_frame = ttk.LabelFrame(outer, text="Amp execution log", padding=10)
        log_frame.grid(row=4, column=0, sticky="nsew")
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        self.log = tk.Text(log_frame, wrap="word", state="disabled", font=("Cascadia Mono", 9), bg="#0b1220", fg="#dbeafe")
        scrollbar = ttk.Scrollbar(log_frame, orient="vertical", command=self.log.yview)
        self.log.configure(yscrollcommand=scrollbar.set)
        self.log.grid(row=0, column=0, sticky="nsew")
        scrollbar.grid(row=0, column=1, sticky="ns")

        ttk.Label(outer, textvariable=self.status_var).grid(row=5, column=0, sticky="w", pady=(10, 0))

    def _choose_paper(self) -> None:
        filename = filedialog.askopenfilename(
            title="Choose research paper",
            initialdir=str(APP_DIR),
            filetypes=[("PDF papers", "*.pdf"), ("All files", "*.*")],
        )
        if filename:
            self.paper_var.set(filename)

    def _choose_work_folder(self) -> None:
        folder = filedialog.askdirectory(title="Choose work folder", initialdir=str(APP_DIR), mustexist=True)
        if folder:
            self.work_var.set(folder)

    def _selected_request(self) -> tuple[Path, Path, str, str]:
        paper, work_folder, amp_executable = validate_inputs(self.paper_var.get(), self.work_var.get())
        return paper, work_folder, amp_executable, build_prompt(paper, work_folder)

    def _preview_prompt(self) -> None:
        try:
            _, _, _, prompt = self._selected_request()
        except ValueError as error:
            messagebox.showerror("Cannot preview workflow", str(error), parent=self.root)
            return

        window = tk.Toplevel(self.root)
        window.title("Generated Amp prompt")
        window.geometry("820x620")
        text = tk.Text(window, wrap="word", font=("Cascadia Mono", 9), padx=14, pady=14)
        text.insert("1.0", prompt)
        text.configure(state="disabled")
        text.pack(fill="both", expand=True)

    def _start(self) -> None:
        if self.process is not None:
            return
        try:
            paper, work_folder, amp_executable, prompt = self._selected_request()
        except ValueError as error:
            messagebox.showerror("Cannot start workflow", str(error), parent=self.root)
            return

        self._set_running(True)
        self.stop_requested = False
        self._append_log(f"Paper: {paper}\nWork folder: {work_folder}\nMode: high\n\nStarting Amp. Complex workflows may run for a long time.\n\n")
        self.status_var.set("Amp is executing the 10-step workflow…")

        worker = threading.Thread(
            target=self._run_amp,
            args=(amp_executable, work_folder, prompt),
            daemon=True,
        )
        worker.start()

    def _run_amp(self, amp_executable: str, work_folder: Path, prompt: str) -> None:
        command = [
            amp_executable,
            "--no-ide",
            "--no-notifications",
            "--no-color",
            "--mode",
            "high",
            "--no-archive-after-execute",
            "--execute",
        ]
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW

        try:
            process = subprocess.Popen(
                command,
                cwd=work_folder,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                creationflags=creation_flags,
            )
            self.process = process
            assert process.stdin is not None
            assert process.stdout is not None
            process.stdin.write(prompt)
            process.stdin.close()

            for line in process.stdout:
                self.events.put(("log", line))

            exit_code = process.wait()
            self.events.put(("done", exit_code))
        except Exception as error:
            self.events.put(("error", str(error)))

    def _stop(self) -> None:
        process = self.process
        if process is None:
            return
        self.stop_requested = True
        self.status_var.set("Stopping Amp…")
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW,
            check=False,
        )

    def _drain_events(self) -> None:
        try:
            while True:
                event, payload = self.events.get_nowait()
                if event == "log":
                    self._append_log(str(payload))
                elif event == "done":
                    exit_code = int(payload)
                    self.process = None
                    self._set_running(False)
                    if self.stop_requested:
                        self.status_var.set("Workflow stopped by user.")
                        self._append_log("\nWorkflow stopped by user.\n")
                    elif exit_code == 0:
                        self.status_var.set("Workflow completed successfully.")
                        self._append_log("\nAmp finished successfully.\n")
                    else:
                        self.status_var.set(f"Amp exited with code {exit_code}.")
                        self._append_log(f"\nAmp exited with code {exit_code}. Review the output above.\n")
                elif event == "error":
                    self.process = None
                    self._set_running(False)
                    self.status_var.set("Could not run Amp.")
                    self._append_log(f"\nERROR: {payload}\n")
        except queue.Empty:
            pass
        self.root.after(100, self._drain_events)

    def _set_running(self, running: bool) -> None:
        self.go_button.configure(state="disabled" if running else "normal")
        self.stop_button.configure(state="normal" if running else "disabled")
        if running:
            self.progress.start(12)
        else:
            self.progress.stop()

    def _append_log(self, text: str) -> None:
        self.log.configure(state="normal")
        self.log.insert("end", text)
        self.log.see("end")
        self.log.configure(state="disabled")

    def _on_close(self) -> None:
        if self.process is not None:
            close = messagebox.askyesno(
                "Workflow is running",
                "Stop Amp and close the application?",
                parent=self.root,
            )
            if not close:
                return
            self._stop()
        self.root.destroy()


def main() -> None:
    root = tk.Tk()
    PaperWorkflowApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
