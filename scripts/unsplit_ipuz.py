#!/usr/bin/env python3
import json
import os
import argparse
from pathlib import Path

def unsplit_ipuz(dir_path):
    path = Path(dir_path)
    if not path.is_dir():
        print(f"Error: {dir_path} is not a directory.")
        return

    combined_data = {}
    
    # Files to look for
    parts = ['metadata.json', 'puzzle.json', 'solution.json']
    found_any = False

    for part_name in parts:
        part_file = path / part_name
        if part_file.exists():
            try:
                with open(part_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        combined_data.update(data)
                        found_any = True
                    else:
                        print(f"Warning: {part_file} does not contain a JSON object. Skipping.")
            except json.JSONDecodeError as e:
                print(f"Error parsing {part_file}: {e}")
                return
            except Exception as e:
                print(f"Error reading {part_file}: {e}")
                return

    if not found_any:
        print(f"Error: No valid split files found in {dir_path}")
        return

    # If solution is missing, assume it is a contest puzzle
    if 'solution' not in combined_data:
        print(f"Note: No solution found for {path.name}, setting contestMode=true")
        combined_data['contestMode'] = True

    # Output file path: directory name + .ipuz
    output_file = path.parent / (path.name + ".ipuz")
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(combined_data, f, indent=2, ensure_ascii=False)
            f.write('\n')
        print(f"Merged {path}/ -> {output_file}")
    except OSError as e:
        print(f"Error writing to {output_file}: {e}")

def main():
    parser = argparse.ArgumentParser(
        description="Merge split ipuz files (metadata, puzzle, solution) back into a single .ipuz file."
    )
    parser.add_argument('directories', nargs='+', help='Path to one or more directories to unsplit')
    args = parser.parse_args()

    for d in args.directories:
        unsplit_ipuz(d)

if __name__ == "__main__":
    main()