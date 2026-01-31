import sys
import json
import re
import os

# Try to import BeautifulSoup
try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: BeautifulSoup4 is required. Please install it using: pip install beautifulsoup4")
    sys.exit(1)

def parse_html_to_ipuz(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')

    # 1. Metadata
    title_el = soup.find(id="title")
    title = title_el.get_text(strip=True) if title_el else "Untitled"
    
    author_el = soup.find(id="author")
    author = author_el.get_text(strip=True) if author_el else "Unknown"

    # 2. Dimensions
    grid_area = soup.find(class_="grid-area")
    width = 0
    height = 0
    if grid_area and grid_area.has_attr('style'):
        style = grid_area['style']
        w_match = re.search(r'--puzzle-w:\s*(\d+)', style)
        h_match = re.search(r'--puzzle-h:\s*(\d+)', style)
        if w_match: width = int(w_match.group(1))
        if h_match: height = int(h_match.group(1))

    if width == 0 or height == 0:
        raise ValueError("Could not determine grid dimensions from style attributes.")

    # 3. Grid
    puzzle = []
    solution = []
    
    # Initialize grids
    for _ in range(height):
        puzzle.append([None] * width)
        solution.append([None] * width)

    crossword_div = soup.find(class_="crossword")
    if not crossword_div:
        raise ValueError("Could not find crossword grid div")

    r, c = 0, 0
    # Iterate through direct children that are divs (boxes and endRows)
    for child in crossword_div.find_all("div", recursive=False):
        classes = child.get("class", [])
        
        if "endRow" in classes:
            r += 1
            c = 0
            continue
        
        if "box" in classes:
            if r >= height or c >= width:
                continue

            if "empty" in classes:
                # Black square
                puzzle[r][c] = "#"
                solution[r][c] = "#"
            elif "letter" in classes:
                # White square
                # Check for number
                clue_num_span = child.find(class_="cluenum-in-box")
                cell_num = 0
                if clue_num_span:
                    # Extract digits only
                    num_text = clue_num_span.get_text()
                    num_match = re.search(r'\d+', num_text)
                    if num_match:
                        cell_num = int(num_match.group(0))
                
                # Check for solution letter
                letter_span = child.find(class_="letter-in-box")
                sol_char = ""
                if letter_span:
                    sol_char = letter_span.get_text(strip=True)

                if cell_num > 0:
                    puzzle[r][c] = {"cell": cell_num}
                else:
                    puzzle[r][c] = 0
                
                solution[r][c] = sol_char
            
            c += 1

    # 4. Clues
    clues = {"Across": [], "Down": []}
    
    clue_divs = soup.find_all(class_="clueDiv")
    for cd in clue_divs:
        direction = cd.get("direction") # "across" or "down"
        clue_num_div = cd.find(class_="clueNum")
        clue_text_span = cd.find(class_="clueText")
        
        if direction and clue_num_div and clue_text_span:
            try:
                num_text = clue_num_div.get_text(strip=True)
                num = int(re.search(r'\d+', num_text).group(0))
                
                # Use decode_contents to preserve HTML tags like <i>
                text = clue_text_span.decode_contents().strip()
                
                dir_key = direction.capitalize() # "Across" or "Down"
                if dir_key in clues:
                    clues[dir_key].append([num, text])
            except (ValueError, AttributeError):
                continue

    # Construct IPUZ
    ipuz_data = {
        "version": "http://ipuz.org/v1",
        "kind": ["http://ipuz.org/crossword#1"],
        "title": title,
        "author": author,
        "dimensions": {"width": width, "height": height},
        "puzzle": puzzle,
        "solution": solution,
        "clues": clues
    }
    
    return ipuz_data

def main():
    if len(sys.argv) < 2:
        print("Usage: python html_to_ipuz.py <input_html> [output_ipuz]")
        return
        
    input_path = sys.argv[1]
    if len(sys.argv) > 2:
        output_path = sys.argv[2]
    else:
        base, _ = os.path.splitext(input_path)
        output_path = base + ".ipuz"
    
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
            
        ipuz_data = parse_html_to_ipuz(html_content)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            # Use compact separators for smaller file size
            json.dump(ipuz_data, f, indent=None, separators=(',', ':'), ensure_ascii=False)
            
        print(f"Successfully converted '{input_path}' to '{output_path}'")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
