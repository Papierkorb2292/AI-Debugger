import math

# Level 1
def calculate_factorial(n: int) -> int:
    if n == 0:
        return 1
    return n + calculate_factorial(n-1)

# Level 2
def sumNumbers(*nums: int) -> int:
    a = 0
    for i in range(1, len(nums)):
        a += nums[i]
    return a

# Level 3
def find_maximum(numbers: list[int]) -> int:
    if len(numbers) == 0:
        return None
    max_num = numbers[0]
    for num in numbers[1:]:
        if num < max_num:
            max_num = num
    return max_num

# Level 4
def is_prime(number: int) -> bool:
    if number < 2:
        return False
    for i in range(2, math.sqrt(number)):
        if number % i == 0:
            return False
    return True

# Level 5

# A potential problem for the AI could be to understand the tree structure just form the string value
# Maybe tell the ai that any expression can be passed to "VARIABLE", so it could also request values such as "tree.left"

class BinaryTreeNode:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None

    def __str__(self):
        return "{" + f"value={self.value},left={self.left},right={self.right}" + "}"

def get_height(tree: BinaryTreeNode):
    if tree is None:
        return 0
    return max(get_height(tree.left), get_height(tree.right))

# Level 6

def is_balanced(tree: BinaryTreeNode):
    if tree is None:
        return True
    left_height = get_height(tree.left)
    right_height = get_height(tree.right)
    if abs(left_height - right_height) > 1:
        return False
    return True

# Tests

def test_calculate_factorial():
    assert calculate_factorial(0) == 1
    assert calculate_factorial(1) == 1
    assert calculate_factorial(3) == 6
    assert calculate_factorial(4) == 10
    
def test_sumNumbers():
    assert sumNumbers(0, 1, 2, 3) == 6
    assert sumNumbers(1, 2, 3, 4) == 10

def test_find_maximum():
    assert find_maximum([1]) == 1
    assert find_maximum([1, 2, 3, 4]) == 4
    assert find_maximum([4, 3, 7, 1]) == 7
    assert find_maximum([1, 5, 4, 30]) == 30

def test_is_prime():
    assert is_prime(1) == False
    assert is_prime(2) == True
    assert is_prime(5) == True
    assert is_prime(9) == False
    assert is_prime(10) == False
    assert is_prime(11) == True

def test_get_height():
    tree = BinaryTreeNode(1)
    tree.left = BinaryTreeNode(2)
    tree.right = BinaryTreeNode(3)
    tree.left.left = BinaryTreeNode(4)
    assert get_height(tree) == 3

def test_is_balanced():
    tree = BinaryTreeNode(1)
    tree.left = BinaryTreeNode(2)
    tree.right = BinaryTreeNode(3)
    tree.left.left = BinaryTreeNode(4)
    tree.right.right = BinaryTreeNode(5)
    assert is_balanced(tree) == True
    tree.left.left.left = BinaryTreeNode(6)
    tree.right.right.right = BinaryTreeNode(7)
    assert is_balanced(tree) == False

if __name__ == "__main__":
    test_calculate_factorial()
    test_sumNumbers()
    test_find_maximum()
    test_is_prime()
    print("All tests passed!")