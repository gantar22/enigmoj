import json
import sys
import os

def main():
    if len(sys.argv) < 2:
        print("Usage: python strip_solution.py <puzzle_file.ipuz>")
        return

    filepath = sys.argv[1]
    
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if 'solution' in data:
            del data['solution']
            print("Solution removed.")
        else:
            print("No solution field found.")

        # Create output filename
        filename, ext = os.path.splitext(filepath)
        output_path = f"{filename}_secure{ext}"

        with open(output_path, 'w', encoding='utf-8') as f:
            # Use compact separators for smaller file size since it's for web
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        
        print(f"Secure puzzle saved to: {output_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()