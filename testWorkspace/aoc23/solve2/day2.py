def read_file_lines(path: str) -> list[str]:
    with open(path) as file:
        return file.readlines()

def solve(input: list[str]) -> object:
    # ...
    return 0

print("Test Solve:", solve(read_file_lines("test_input.txt")))
print("Actual Solve:", solve(read_file_lines("input.txt")))