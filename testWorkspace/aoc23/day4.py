def read_file_lines(path: str) -> list[str]:
    with open(path) as file:
        return file.readlines()

def solve_part_1(input: list[str]) -> object:
    sum = 0
    for card in input:
        (winning_string, present_string) = card.split(":")[1].split("|")
        winning_set = set(winning_string.split())
        present_set = set(present_string.split())
        intersection = winning_set & winning_set
        if len(intersection) == 0:
            continue
        sum += 1 << (len(intersection) - 1)
    return sum

def solve_part_2(input: list[str]) -> object:
    card_points = []
    for card in input:
        (winning_string, present_string) = card.split(":")[1].split("|")
        winning_set = set(winning_string.split())
        present_set = set(present_string.split())
        intersection = winning_set & present_set
        card_points.append(len(intersection))
    card_counts = [1 for _ in input]
    total = 0
    while len(card_counts) > 0:
        count = card_counts.pop(0)
        total += count
        points = card_points.pop(0)
        for i in range(points):
            card_counts[i] += count
    return total

print("Test Solve 1:", solve_part_1(read_file_lines("test_input.txt")))
print("Actual Solve 1:", solve_part_1(read_file_lines("input.txt")))
print("Test Solve 2:", solve_part_2(read_file_lines("test_input.txt")))
print("Actual Solve 2:", solve_part_2(read_file_lines("input.txt")))

# AI found first logic error location: Only doing sum += 1 << len(intersection), which is missing a special check for length=0 and in other cases is always double the expected point number
#   AI only responsed with the calculation being incorrect, not with an explanation of why the calculation is wrong. This might be solved if the user had the possiblity to chat with the AI to prompt it for a solution.
# AI found first typo: Using winning_set & winning_set instead of winning_set & present_set in line 11
#   The AI did this by comparing EVAL winning_set with EVAL intersection, the AI didn't even fetch line 11

# AI found first logic error: Adding the next card multiple times instead of the next few consecutive cards once
# AI did NOT find first typo: appending points from part 1 instead of winning number count in line 24
#   AI responded the issue is using sets since numbers could appear twice (which they don't) potentially leading to an incorrect count