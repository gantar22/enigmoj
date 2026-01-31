#!/usr/bin/env python3
import json
import os
import argparse
from pathlib import Path

def split_ipuz(file_path):
    path = Path(file_path)
    if not path.exists():
        print(f"Error: File {file_path} not found.")
        return

    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse JSON in {file_path}: {e}")
        return
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return

    # Create output directory based on filename stem (e.g., 'puzzle.ipuz' -> 'puzzle/')
    output_dir = path.parent / path.stem
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        print(f"Error creating directory {output_dir}: {e}")
        return

    # Define fields for each category
    # Metadata: author, description, dimensions, and other informational fields
    metadata_fields = [
        'version', 'kind', 'copyright', 'publisher', 'url', 'uniqueid', 
        'title', 'intro', 'explanation', 'annotation', 'author', 'editor', 
        'date', 'notes', 'difficulty', 'origin', 'block', 'dimensions', 
        'description', 'contestMode'
    ]
    
    # Puzzle: grid and clues (and style info that affects the grid)
    puzzle_fields = ['puzzle', 'clues', 'style']
    
    # Solution: the solution grid
    solution_fields = ['solution']

    # Helper to extract subset of data
    def extract_fields(fields):
        return {k: data[k] for k in fields if k in data}

    metadata_data = extract_fields(metadata_fields)
    puzzle_data = extract_fields(puzzle_fields)
    solution_data = extract_fields(solution_fields)

    # Helper to write JSON file
    def write_part(name, content):
        out_file = output_dir / name
        try:
            with open(out_file, 'w', encoding='utf-8') as f:
                json.dump(content, f, indent=2, ensure_ascii=False)
                f.write('\n')
        except OSError as e:
            print(f"Error writing {out_file}: {e}")

    write_part('metadata.json', metadata_data)
    write_part('puzzle.json', puzzle_data)
    write_part('solution.json', solution_data)

    print(f"Processed {path.name} -> {output_dir}/")

def main():
    parser = argparse.ArgumentParser(
        description="Split ipuz files into metadata, puzzle, and solution files."
    )
    parser.add_argument('files', nargs='+', help='Path to one or more .ipuz files')
    args = parser.parse_args()
    
    for file_path in args.files:
        split_ipuz(file_path)

if __name__ == "__main__":
    main()