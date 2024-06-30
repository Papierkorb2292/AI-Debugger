def sumNumbers(*nums):
    a = 0
    for i in range(1, len(nums)):
        a += nums[i]
    return a

def tests():
    assert sumNumbers(0, 1, 2, 3) == 6
    assert sumNumbers(1, 2, 3, 4) == 10
    print("All tests passed")

if __name__ == "__main__":
    tests()