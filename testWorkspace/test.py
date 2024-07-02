import math

# Level 1 - Success ("incorrectly uses addition instead of multiplication")
def calculate_factorial(n: int) -> int:
    if n == 0:
        return 1
    return n + calculate_factorial(n-1)

# Level 2 - Success ("index must start at 0")
def sumNumbers(*nums: int) -> int:
    a = 0
    for i in range(1, len(nums)):
        a += nums[i]
    return a

# Level 3 - Success ("comparison operator should be `>` instead of `<`)
def find_maximum(numbers: list[int]) -> int:
    if len(numbers) == 0:
        return None
    max_num = numbers[0]
    for num in numbers[1:]:
        if num < max_num:
            max_num = num
    return max_num

# Level 4 - Sucess ("loop should include upper bound") - THe AI did this without looking at the value of the variable?
def is_prime(number: int) -> bool:
    if number < 2:
        return False
    for i in range(2, int(math.sqrt(number))):
        if number % i == 0:
            return False
    return True

# Level 5 - Sucess ("incorrect condition: end of the range should be exlusive")

class StringRange:
    def __init__(self, startInclusive,endExclusive):
        self.startInclusive = startInclusive
        self.endExclusive = endExclusive

    def __str__(self):
        return f"StringRange(startInclusive={self.startInclusive},endInclusive={self.endExclusive})"
    
def containsCursor(stringRange: StringRange, cursor: int) -> bool:
    return cursor >= stringRange.startInclusive and cursor <= stringRange.endExclusive

# Level 6 - No sucess (Correct in the beginning, but the direct code change it tries to make is not correct: "Base case for leaf returns incorrect values (Yes, it should return 0 instead of 1 when a node without children is given). Base case should return 0 when `tree` is `None`, not 1 (Wrong, it already returns 0, it should actually return -1 instead, so a node without children can return 0)")

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
    return 1 + max(get_height(tree.left), get_height(tree.right))

# Level 7 - No sucess (Blames get_height, "Should return 0 instead of 1 when node is `NONE`", it should bei neither 0 or 1, get_height is correct!)

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

def test_contains_cursor():
    assert containsCursor(StringRange(0, 10), 5) == True
    assert containsCursor(StringRange(2, 9), 9) == False

def test_get_height():
    tree = BinaryTreeNode(1)
    tree.left = BinaryTreeNode(2)
    tree.right = BinaryTreeNode(3)
    tree.left.left = BinaryTreeNode(4)
    assert get_height(tree) == 2

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
    #test_calculate_factorial()
    #test_sumNumbers()
    #test_find_maximum()
    #test_is_prime()
    #test_contains_cursor()
    test_get_height()
    test_is_balanced()
    print("All tests passed!")