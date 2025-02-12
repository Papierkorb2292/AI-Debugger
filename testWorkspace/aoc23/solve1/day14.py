def read_file_lines(path: str) -> list[str]:
    with open(path) as file:
        return [x.removesuffix("\n") for x in file.readlines()]

def roll_north(grid: tuple[tuple[str]]) -> tuple[tuple[str]]:
    result = [ ['.'] * len(grid[0]) for _ in range(len(grid)) ] 
    for y, line in enumerate(grid):
        for x, char in enumerate(line):
            if char == '#':
                result[y][x] = '#'
                continue
            if char == 'O':
                y_rolled = y
                while y_rolled > 0 and result[y_rolled-1][x] == '.':
                    y_rolled -= 1
                result[y_rolled][x] = 'O'
    return tuple(tuple(row) for row in result)


def solve_part_1(input: list[str]) -> object:
    grid = tuple(tuple(line) for line in input)
    rolled_grid = roll_north(grid)
    total = 0
    for y, row in enumerate(rolled_grid):
        for cell in row:
            if cell == 'O':
                total += len(rolled_grid) - y 
    return total

def rotate_grid(grid: tuple[tuple[str]]) -> tuple[tuple[str]]:
    result = []
    for x in range(len(grid[0])):
        row = []
        for y in range(len(grid)):
            row.append(grid[y][x])
        result.append(row)
    return tuple(tuple(row) for row in result)


def solve_part_2(input: list[str]) -> object:
    grid = tuple(tuple(line) for line in input)
    seen_grids = {}
    i = 0
    while i < 100000000:
        seen_prev = seen_grids.get(grid)
        seen_grids[grid] = i
        if seen_prev != None and seen_prev != i:
            diff = i - seen_prev
            i = 1000000000 - ((1000000000 - i) % diff)
            continue
        for _ in range(4):
            grid = rotate_grid(roll_north(grid))
        i += 1
    total = 0
    for y, row in enumerate(grid):
        for cell in row:
            if cell == 'O':
                total += len(grid) - y 
    return total


print("Test Solve 1:", solve_part_1(read_file_lines("test_input.txt")))
print("Actual Solve 1:", solve_part_1(read_file_lines("input.txt")))
print("Test Solve 2:", solve_part_2(read_file_lines("test_input.txt")))
print("Actual Solve 2:", solve_part_2(read_file_lines("input.txt")))

# AI did NOT find first logic error: Only checking for # when rolling north in line 14
#   The AI stepped through the loops without any EVAL and without skipping irrelevant parts
# AI did NOT find first typo: Swapping x and y in line 10
#   The AI stepped through the loops without any EVAL and without skipping irrelevant parts

# TODO: Logic error: Not reversing row in line 36
# TODO: Typo: Missing 0 in line 45

# row.reverse()