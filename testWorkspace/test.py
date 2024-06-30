import math

# Level 1
def calculate_factorial(n):
    if n == 0:
        return 1
    return n + calculate_factorial(n-1)

# Level 2
def sumNumbers(*nums):
    a = 0
    for i in range(1, len(nums)):
        a += nums[i]
    return a

# Level 3
def find_maximum(numbers):
    if len(numbers) == 0:
        return None
    max_num = numbers[0]
    for num in numbers[1:]:
        if num < max_num:
            max_num = num
    return max_num

# Level 4
def is_prime(number):
    if number < 2:
        return False
    for i in range(2, math.sqrt(number)):
        if number % i == 0:
            return False
    return True

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

if __name__ == "__main__":
    test_calculate_factorial()
    test_sumNumbers()
    test_find_maximum()
    test_is_prime()
    print("All tests passed!")