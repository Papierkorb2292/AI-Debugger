import math

def read_file_lines(path: str) -> list[str]:
    with open(path) as file:
        return file.readlines()

# total_time = time_pushed + distance / velocity
# total_time = time_pushed + distance / time_pushed
# total_time * time_pushed = time_pushed^2 + distance
# 0 = time_pushed^2 - total_time * time_pushed + distance
# time_pushed = total_time/2 +- sqrt(total_time^2 / 4 - distance)
# number_of_possibilites = ceil(max_time_pushed) - floor(min_time_pushed) - 1

def solve_part_1(input: list[str]) -> object:
    times = [int(x) for x in input[0].split()[1:]]
    distances = [int(x) for x in input[1].split()[1:]]
    total = 1
    for i in range(len(times)):
        time = times[i]
        distance = distances[i]
        # First term of quadratic formula
        average_time = time / 2
        # Second term of quadratic formula
        deviation_time = math.sqrt(time*time / 4 - distance)
        # Count the amount of integers between the two roots
        total *= math.ceil(average_time + deviation_time) - math.floor(average_time - deviation_time) - 1
    return total

def solve_part_2(input: list[str]) -> object:
    time = int("".join(input[0].split()[1:]))
    distance = int("".join(input[1].split()[1:]))
    average_time = time / 2
    deviation_time = math.sqrt(time*time / 4 - distance)
    return math.ceil(average_time + deviation_time) - math.floor(average_time - deviation_time) - 1

print("Test Solve 1:", solve_part_1(read_file_lines("test_input.txt")))
print("Actual Solve 1:", solve_part_1(read_file_lines("input.txt")))
print("Test Solve 2:", solve_part_2(read_file_lines("test_input.txt")))
print("Actual Solve 2:", solve_part_2(read_file_lines("input.txt")))

# AI did NOT find first logic error: Including the roots of the polyonmial as possible times (but you're supposed to go over the distance, not match it exactly)
#   Instead, the AI blamed the calculation of deviation_time
# AI did NOT find first typo: Adding the number of possibilities together instead of multiplying them
#   Instead, the AI blamed the calculation of deviation_time by asumming a different quadratic formula with sqrt(time*time - 4 * distance)

# AI found first logic error (after I pointed out in the prompt that the calculated time value is incorrect and what is should be): Sum instead of concat in line 29
# AI foind first typo: Index 0 instead of 1 in line 30 (but the AI additionally responded that it is incorrect that the strings are concatenated, thereby misunderstanding the prompt)