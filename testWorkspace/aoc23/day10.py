def read_file_lines(path: str) -> list[str]:
    with open(path) as file:
        return [x.removesuffix("\n") for x in file.readlines()]
    
LEFT = (-1, 0)
RIGHT = (1, 0)
UP = (0, -1)
DOWN = (0, 1)

PIPE_PARTS = {
    "|": {UP, DOWN},
    "-": {LEFT, RIGHT},
    "L": {UP, RIGHT},
    "J": {UP, LEFT},
    "F": {DOWN, RIGHT},
    "7": {DOWN, LEFT}
}

def sum_vec(left: tuple[int], right: tuple[int]) -> tuple[int]:
    return tuple(a+b for (a,b) in zip(left, right))

def invert_vec(vec: tuple[int]) -> tuple[int]:
    return tuple(-x for x in vec)
    
def solve_part_1(input: list[str]) -> object:
    for y, line in enumerate(input):
        x = line.find("S")
        if x != -1:
            start_pos = (x, y)
    for direction in [LEFT, UP]:
        pos = sum_vec(start_pos, direction)
        char = input[pos[1]][pos[0]]
        pipe_directions = PIPE_PARTS.get(char)
        if pipe_directions != None and invert_vec(direction) in pipe_directions:
            current_direction = direction
    current_pos = sum_vec(start_pos, current_direction)
    step_count = 1
    while current_pos != start_pos:
        step_count += 1
        char = input[current_pos[1]][current_pos[0]]
        pipe_directions = PIPE_PARTS.get(char)
        current_direction = (pipe_directions - {invert_vec(current_direction)}).pop()
        current_pos = sum_vec(current_pos, current_direction)
    return step_count >> 1

def solve_part_2(input: list[str]) -> object:
    # Find starting point
    for y, line in enumerate(input):
        x = line.find("S")
        if x != -1:
            start_pos = (x, y)
    # Find pipes connected to start
    for direction in [LEFT, RIGHT, UP, DOWN]:
        pos = sum_vec(start_pos, direction)
        char = input[pos[0]][pos[1]]
        pipe_directions = PIPE_PARTS.get(char)
        if pipe_directions != None and invert_vec(direction) in pipe_directions:
            current_direction = direction
    current_pos = sum_vec(start_pos, current_direction)
    # Go through loop and apply shoelace algorithm to get contained cells
    area_total = start_pos[0] * current_pos[1] - current_pos[0] * start_pos[1]
    circumference = 1
    while current_pos != start_pos:
        circumference += 1
        char = input[current_pos[1]][current_pos[0]]
        pipe_directions = PIPE_PARTS.get(char)
        current_direction = (pipe_directions - {invert_vec(current_direction)}).pop()
        new_pos = sum_vec(current_pos, current_direction)
        area_total += current_pos[0] * new_pos[1] - new_pos[0] * current_pos[1]
        current_pos = new_pos
    # Divide area_total by two since we are calculating the area of triangles
    # Subtract half of circumference since edge cells are not included where each straight edge cell adds 0.5 area
    # Add one to add in the missing four corners that were counted twice when subtracting edge cells and didn't cancel out
    return ((abs(area_total) - circumference) >> 1) + 1


print("Test Solve 1:", solve_part_1(read_file_lines("test_input.txt")))
print("Actual Solve 1:", solve_part_1(read_file_lines("input.txt")))
print("Test Solve 2:", solve_part_2(read_file_lines("test_input.txt")))
print("Actual Solve 2:", solve_part_2(read_file_lines("input.txt")))

# AI did NOT find logic error: Not inverting direction vector when comparing with pipe connection vectors in line 34
#   The AI stepped through the relevant loops but either did not request enough variables or didn't make the connection that the vectors in pipe_directions corresponding to direction would be reversed
# AI did NOT find typo: Missing two directions on line 30, leading to no pipes being found and thus the current_direction variable not being assigned
#   The AI responded that the problem was in the input data, because no S was found (apparently) and the loop for assigning current_direction is only run when x != -1 (apparently)

# AI did NOT find logic error: Missing parentheses in line 72, leading to incorrect order of operations (+ before >>)
#   The AI took too long to step through the loops (despite being instructed to skip loops when they're irrelevant), which resulted in a long conversation history that we decided to interrupt
# AI did NOT find typo: Swapping indices in line 55
#   Again, loops provided a difficulty, leading the AI to keep on requesting lines after the loop and semmingly give commands as if the requested line was the line the program was paused on (like responding STEPINTO after requesting a line with a function call, even though the program was actually still stepping through the loop)