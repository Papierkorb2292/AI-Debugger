def read_file_lines(path: str) -> list[str]:
    with open(path) as file:
        return [x.removesuffix("\n") for x in file.readlines()]

def solve_part_1(input: list[str], start = (0, 0, 1, 0)) -> object:
    energized = set()
    energized_directions = set()
    beams = [start]
    while len(beams) != 0:
        new_beams = []
        for beam in beams:
            if beam in energized_directions:
                continue
            if beam[0] < 0 or beam[0] >= len(input[0]) or beam[1] < 0 or beam[1] >= len(input):
                continue
            energized.add((beam[0], beam[1]))
            energized_directions.add(beam)
            char = input[beam[1]][beam[0]]
            if char == '/':
                new_beams.append((beam[0] - beam[3], beam[1] - beam[2], -beam[3], -beam[2]))
            elif char == '\\':
                new_beams.append((beam[0] + beam[3], beam[1] + beam[2], beam[3], beam[2]))
            elif char == '-' and beam[3] != 0:
                new_beams.append((beam[0] + 1, beam[1], 1, 0))
                new_beams.append((beam[0] - 1 , beam[1], -1, 0))
            elif char == '|' and beam[2] != 0:
                new_beams.append((beam[0], beam[1] + 1, 0, 1))
                new_beams.append((beam[0], beam[1] - 1, 0, -1))
            else:
                new_beams.append((beam[0] + beam[2], beam[1] + beam[3], beam[2], beam[3]))
        beams = new_beams
    return len(energized)


def solve_part_2(input: list[str]) -> object:
    maximum = 0
    for y in range(len(input)):
        maximum = max(maximum, solve_part_1(input, (0, y, 1, 0)))
        maximum = max(maximum, solve_part_1(input, (len(input[0])-1, y, -1, 0)))
    for x in range(len(input[0])):
        maximum = max(maximum, solve_part_1(input, (x, 0, 0, 1)))
        maximum = max(maximum, solve_part_1(input, (x, len(input)-1, 0, -1)))
    return maximum


print("Test Solve 1:", solve_part_1(read_file_lines("test_input.txt")))
print("Actual Solve 1:", solve_part_1(read_file_lines("input.txt")))
print("Test Solve 2:", solve_part_2(read_file_lines("test_input.txt")))
print("Actual Solve 2:", solve_part_2(read_file_lines("input.txt")))

# TODO: Logic error: Use list instead of set in line 6
# TODO: Typo: Use index 2 instead of 3 in line 23

# TODO: Logic error: Not subtracting 1 from horizontal length in line 39
# TODO: Typo: Putting x in second position instead of first in line 41