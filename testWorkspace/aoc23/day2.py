def read_file_lines(path: str) -> list[str]:
    with open(path) as file:
        return file.readlines()

max_count = { "red": 12, "green": 13, "blue": 14}

def solve_part_1(input: list[str]) -> object:
    valid_count = 0
    for game in input:
        (id, data) = game.split(": ")
        rounds = data.split("; ")
        is_valid = True
        for round in rounds:
            for component in round.split(", "):
                (count, color) = component.split()
                if max_count[color] < int(count):
                    is_valid = False
        if is_valid:
            valid_count += int(id.split()[1])
    return valid_count

def solve_part_2(input: list[str]) -> object:
    power_sum = 0
    for game in input:
        min_count = { "red": 0, "green": 0, "blue": 0 }
        rounds = game.split(": ")[1].split("; ")
        for round in rounds:
            for component in round.split(", "):
                (count, color) = component.split()
                min_count[color] = max(min_count[color], int(count))
        power = 1
        for count in min_count.values():
            power *= count
        power_sum += power
    return power_sum

print("Test Solve 1:", solve_part_1(read_file_lines("test_input.txt")))
print("Actual Solve 1:", solve_part_1(read_file_lines("input.txt")))
print("Test Solve 2:", solve_part_2(read_file_lines("test_input.txt")))
print("Actual Solve 2:", solve_part_2(read_file_lines("input.txt")))





# AI found first logic error: using <= instead of < in line 16
# AI (after trying out prompts and directing the AI to the relevant section) found second logic error: only adding 1 in line 19 instead of adding the game id
# AI found first typo: whitespace whitespace in line 10 before colon
#   The AI responded with the correct string that doesn't have the extra whitespace

# AI found first logic error: missing int() to convert count to a string before passing it to max
# AI found second logic error: Iterating over keys of min_count instead of values, causing a type error when trying to multiply with string
# AI found first typo: Muliplying by min_count instead of count