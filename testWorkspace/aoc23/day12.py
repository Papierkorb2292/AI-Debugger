import functools

def read_file_lines(path: str) -> list[str]:
    with open(path) as file:
        return [x.removesuffix("\n") for x in file.readlines()]

@functools.cache
def count_possiblities(springs: str, groups: tuple[int]) -> int:
    if len(springs) == 0:
        return 1 if len(groups) == 0 else 0
    char = springs[0]
    if char == '.':
        return count_possiblities(springs[1:], groups)
    if char == '#':
        if len(groups) == 0:
            return 0
        group_length = groups[0]
        if group_length > len(springs):
            return 0
        if any(x == '.' for x in springs[1:group_length]):
            return 0
        if group_length != len(springs) and springs[group_length] == '#':
            return 0
        return count_possiblities(springs[group_length+1:], groups[1:])
    if char == '?':
        return count_possiblities(springs[1:], groups) + count_possiblities('#' + springs[1:], groups)
    raise AssertionError("Invalid input char: ", char)

def solve_part_1(input: list[str]) -> object:
    total = 0
    for line in input:
        (springs, groups_str) = line.split()
        groups = [int(x) for x in groups_str.split(",")]
        total += count_possiblities(springs, tuple(groups))
    return total

def solve_part_2(input: list[str]) -> object:
    total = 0
    for line in input:
        (springs, groups_str) = line.split()
        groups = [int(x) for x in groups_str.split(",")]
        unfolded_groups = 6*groups
        unfolded_springs = "?".join(6*[springs])
        total += count_possiblities(unfolded_springs, tuple(unfolded_groups))
    return total


print("Test Solve 1:", solve_part_1(read_file_lines("test_input.txt")))
print("Actual Solve 1:", solve_part_1(read_file_lines("input.txt")))
print("Test Solve 2:", solve_part_2(read_file_lines("test_input.txt")))
print("Actual Solve 2:", solve_part_2(read_file_lines("input.txt")))

# AI did NOT find first logic error: Only checking for != '.' in line 22
#   AI would have consumed too many tokens to get to the relevant section
# AI did NOT find first typo: Checking for >= len(springs) in line 18
#   AI would have consumed too many tokens to get to the relevant section

# AI did NOT find first logic error: Not adding ? in between repeats
#   AI responded that the issue is not intializing total
# AI found first Typo: Repeating 6 times instead of 5