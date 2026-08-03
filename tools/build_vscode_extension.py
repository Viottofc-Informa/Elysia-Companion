#!/usr/bin/env python3
"""
Build and package VS Code extension (.vsix file).

This script compiles the TypeScript extension and creates a new .vsix package.
It should be invoked whenever the extension needs to be rebuilt for distribution.

Usage:
    python tools/build_vscode_extension.py [--output DIR] [--install]

Args:
    --output:  Directory for the output .vsix file (default: project root)
    --install: Install the extension in VS Code after building
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], cwd: Path, description: str) -> None:
    """Execute a shell command and handle errors."""
    print(f"\n▶ {description}...")
    print(f"  Command: {' '.join(cmd)}")

    use_shell = sys.platform == "win32"
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, shell=use_shell)

    if result.returncode != 0:
        print(f"  ❌ FAILED (exit code {result.returncode})")
        if result.stdout:
            print(f"  STDOUT:\n{result.stdout}")
        if result.stderr:
            print(f"  STDERR:\n{result.stderr}")
        sys.exit(1)

    print(f"  ✅ Success")
    if result.stdout:
        lines = result.stdout.strip().split('\n')
        for line in lines[-10:]:
            print(f"    {line}")


def get_package_version(project_dir: Path) -> str:
    """Extract version from package.json."""
    package_json = project_dir / "package.json"
    with open(package_json, 'r') as f:
        data = json.load(f)
    return data.get('version', 'unknown')


def build_extension(project_dir: Path, output_dir: Path) -> Path:
    """
    Build the VS Code extension and return the path to the generated .vsix file.
    """
    version = get_package_version(project_dir)
    print(f"\n📦 Building VS Code Extension")
    print(f"   Project: {project_dir.name}")
    print(f"   Version: {version}")
    print(f"   Output:  {output_dir}")

    # Step 1: Clean old builds
    print("\n🧹 Cleaning previous builds...")
    out_dir = project_dir / "out"
    if out_dir.exists():
        for f in out_dir.glob("*.js"):
            f.unlink()
        print("  ✅ Cleaned old compiled files")

    # Step 2: Install dependencies (if needed)
    node_modules = project_dir / "node_modules"
    if not node_modules.exists():
        run_command(
            ["npm", "install"],
            project_dir,
            "Installing Node.js dependencies"
        )
    else:
        print("  ℹ️ Dependencies already installed (node_modules exists)")

    # Step 3: Compile TypeScript
    run_command(
        ["npx", "tsc", "-p", "./"],
        project_dir,
        "Compiling TypeScript"
    )

    # Step 4: Package with vsce
    print("\n📦 Creating .vsix package...")
    run_command(
        ["npx", "vsce", "package", "--out", str(output_dir)],
        project_dir,
        "Packaging extension"
    )

    # Find the generated .vsix file
    vsix_files = list(output_dir.glob("*.vsix"))

    if not vsix_files:
        raise RuntimeError("No .vsix file was generated")

    vsix_file = max(vsix_files, key=lambda f: f.stat().st_mtime)

    print(f"\n✅ Build complete!")
    print(f"   Output: {vsix_file}")
    print(f"   Size:   {vsix_file.stat().st_size / 1024:.1f} KB")

    return vsix_file


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Build and package VS Code extension",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python tools/build_vscode_extension.py
    python tools/build_vscode_extension.py --install
    python tools/build_vscode_extension.py --output dist/
        """
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output directory for .vsix file (default: project root)"
    )
    parser.add_argument(
        "--install",
        action="store_true",
        help="Install the extension in VS Code after building"
    )

    args = parser.parse_args()

    # Project directory is the parent of tools/
    project_dir = Path(__file__).parent.parent.resolve()
    output_dir = Path(args.output).resolve() if args.output else project_dir

    if not (project_dir / "package.json").exists():
        print(f"❌ Error: No package.json found in {project_dir}", file=sys.stderr)
        return 1

    try:
        vsix_file = build_extension(project_dir, output_dir)

        if args.install:
            print("\n📥 Installing extension in VS Code...")
            run_command(
                ["code", "--install-extension", str(vsix_file), "--force"],
                project_dir,
                "Installing extension"
            )
            print("  ✅ Extension installed successfully")

        return 0

    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
