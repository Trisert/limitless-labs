#!/usr/bin/env python3
"""
Lightweight shader validator for walk/index.html
Checks GLSL syntax without a browser.
Usage: python3 scripts/validate_walk_shader.py
"""
import re
import sys
import os

def extract_shaders(filepath):
    """Extract vertex and fragment shaders from walk/index.html"""
    with open(filepath) as f:
        content = f.read()
    
    vert_match = re.search(r'const vertexShader = `(.*?)`;', content, re.DOTALL)
    frag_match = re.search(r'const fragmentShader = `(.*?)`;', content, re.DOTALL)
    
    if not vert_match or not frag_match:
        print("ERROR: Could not extract shaders from", filepath)
        return None, None
    
    return vert_match.group(1), frag_match.group(1)

def validate_shader(shader, name):
    """Basic GLSL syntax validation"""
    errors = []
    lines = shader.split('\n')
    
    # Check for undeclared variables
    # Find all 'out' parameters in function signatures
    out_params = set()
    for line in lines:
        if 'out vec' in line:
            match = re.search(r'out\s+vec\d+\s+(\w+)', line)
            if match:
                out_params.add(match.group(1))
    
    # Check for variable usage before declaration
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
            if 'd' not in declared and 'd' not in out_params:
                # Check if d is declared earlier in the same scope
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
    
    # Check for gl_FragColor in fragment shader
    if name == "fragment" and 'gl_FragColor' not in shader and 'out vec4' not in shader:
        errors.append("  Missing fragment shader output (gl_FragColor or out vec4)")
    
    return errors

def main():
    filepath = os.path.join(os.path.dirname(__file__), '..', 'walk', 'index.html')
    filepath = os.path.abspath(filepath)
    
    if not os.path.exists(filepath):
        print(f"ERROR: File not found: {filepath}")
        sys.exit(1)
    
    vert, frag = extract_shaders(filepath)
    if vert is None:
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
