#!/usr/bin/env python3
"""
Lightweight shader validator for walk/index.html + js/main.js
Checks GLSL syntax without a browser.
Usage: python3 scripts/validate_walk_shader.py
"""
import re
import sys
import os

def extract_shaders_from_js(filepath):
    """Extract shader URLs from main.js and load them"""
    with open(filepath) as f:
        content = f.read()

    # Find shader paths
    vert_match = re.search(r"loadShader\('([^']+?\.vert)'\)", content)
    frag_match = re.search(r"loadShader\('([^']+?\.frag)'\)", content)

    if not vert_match or not frag_match:
        print("ERROR: Could not find shader paths in", filepath)
        return None, None

    base = os.path.dirname(os.path.dirname(filepath))
    vert_path = os.path.normpath(os.path.join(base, vert_match.group(1)))
    frag_path = os.path.normpath(os.path.join(base, frag_match.group(1)))

    with open(vert_path) as f:
        vert = f.read()
    with open(frag_path) as f:
        frag = f.read()

    return vert, frag

def validate_shader(shader, name):
    """Basic GLSL syntax validation"""
    errors = []
    lines = shader.split('\n')

    # Check for undeclared variables
    declared = set()
    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        # Track declarations
        for match in re.finditer(r'vec\d+\s+(\w+)\s*;', line):
            declared.add(match.group(1))
        for match in re.finditer(r'float\s+(\w+)\s*;', line):
            declared.add(match.group(1))

        # Check for undeclared variable usage
        if 'terrain(' in line and ', d)' in line:
            if 'd' not in declared:
                found = False
                for prev in lines[:i-1]:
                    if 'vec2 d;' in prev or 'vec2 d ' in prev:
                        found = True
                        break
                if not found:
                    errors.append(f"  Line {i}: 'd' used but not declared before terrain() call")

    # Check balanced braces
    depth = 0
    for char in shader:
        if char == '{': depth += 1
        elif char == '}': depth -= 1
        if depth < 0:
            errors.append("  Unbalanced braces")
            break
    if depth != 0:
        errors.append(f"  Unbalanced braces (depth={depth})")

    # Check balanced parentheses
    depth = 0
    for char in shader:
        if char == '(': depth += 1
        elif char == ')': depth -= 1
        if depth < 0:
            errors.append("  Unbalanced parentheses")
            break
    if depth != 0:
        errors.append(f"  Unbalanced parentheses (depth={depth})")

    # Check for fragment shader output
    if name == "fragment" and 'gl_FragColor' not in shader and 'out vec4' not in shader and 'fragColor' not in shader:
        errors.append("  Missing fragment shader output (gl_FragColor or out vec4)")

    return errors

def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    js_path = os.path.join(base, 'walk', 'js', 'main.js')

    if not os.path.exists(js_path):
        print(f"ERROR: File not found: {js_path}")
        sys.exit(1)

    vert, frag = extract_shaders_from_js(js_path)
    if vert is None or frag is None:
        sys.exit(1)

    print(f"Vertex shader: {len(vert)} chars")
    print(f"Fragment shader: {len(frag)} chars")

    all_errors = []
    all_errors.extend(validate_shader(vert, "vertex"))
    all_errors.extend(validate_shader(frag, "fragment"))

    if all_errors:
        print(f"\n✗ {len(all_errors)} error(s) found:")
        for e in all_errors:
            print(e)
        sys.exit(1)
    else:
        print("\n✓ Shader validation PASSED")
        sys.exit(0)

if __name__ == '__main__':
    main()
