import math

def read_file_lines(path: str) -> list[str]:
    with open(path) as file:
        return [x.removesuffix("\n") for x in file.readlines()]
    
def solve_part_1(input: list[str]) -> object:
    nodes = {}
    for line in input[2:]:
        (current, next) = line.split(" = ")
        (next1, next2) = next[1:-1].split(", ")
        nodes[current] = (next1, next2)
    
    position = "AAA"
    steps = 0
    instruction_index = 0
    while position != "ZZZ":
        steps += 1
        instruction = input[0][instruction_index]
        instruction_index = (instruction_index + 1) % len(input[0])
        if instruction == "L":
            position = nodes[position][0]
        else:
            position = nodes[position][1]
    return steps

def solve_part_2(input: list[str]) -> object:
    nodes = {}
    for line in input[2:]:
        (current, next) = line.split(" = ")
        (next1, next2) = next[1:-1].split(", ")
        nodes[current] = (next1, next2)
    
    step_counts = 1

    for node in nodes:
        if not node.endswith("A"):
            continue
        position = node
        steps = 0
        instruction_index = 0
        while not position.endswith("Z"):
            steps += 1
            instruction = input[0][instruction_index]
            instruction_index = (instruction_index + 1) % len(input[0])
            if instruction == "L":
                position = nodes[position][0]
            else:
                position = nodes[position][1]
        step_counts *= steps
    return step_counts


print("Test Solve 2:", solve_part_2(read_file_lines("test_input.txt")))
print("Actual Solve 2:", solve_part_2(read_file_lines("input.txt")))

#print("Test Solve 1:", solve_part_1(read_file_lines("test_input.txt")))
#print("Actual Solve 1:", solve_part_1(read_file_lines("input.txt")))

# AI found first logic error: Not removing closing parentheses from input (because only the \n is removed)
#   AI did not output a solution. This might be solved if the user had the possiblity to chat with the AI to prompt it for a solution.
# AI did NOT find first typo: Not incrementing steps counter in line 18
#   AI instead responded that there was an infinite loop because a node couldn't be found

# AI found first logic error: Multiplying all step counts instead of calculating the least common multiple
#   Note that the AI correctly responded that lcm should be used even though the prompt did not include any mention of the
#   least common multiple. It only included a description of the problem as "the program is supposed to calculate how many steps it will take for each starting point to reach an end node at the same time, if they are in a cycle that brings them back to the start after reaching the end node"
# AI found first typo: Accessing input[1] instead of input[0] in line 44
#   To sucessfully find the typo, the prompt had to include the fact that there are in fact valid instructions in the input data, otherwise the AI responded that the issue is an incorrect handling of empty instruction strings, even though the prompt included that the instructions should be in the first line of the file