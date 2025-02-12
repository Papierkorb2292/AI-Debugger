def sumPolygonAngles(numSides):
    return (numSides - 2) * 180

def containsDigit(numList, digit):
    for num in numList:
        if str(digit) in str(num):
            return True
    return False

def isTowerOfHanoiSolution(towerHeight, moves: list[(int, int)]):
    towers = [[],[],[]]
    for i in range(towerHeight):
        towers[0].append(i)
    for move in moves:
        source, dest = move
        if source < 0 or source > 2 or dest < 0 or dest > 2:
            return False
        if len(towers[source]) == 0:
            return False
        if len(towers[dest]) > 0 and towers[source][-1] < towers[dest][-1]:
            return False
        towers[dest].append(towers[source].pop())
    return len(towers[-1]) == towerHeight

def test():
    assert sumPolygonAngles(5) == 540
    assert containsDigit([12, 56, 79], 5) == True
    assert containsDigit([12, 56, 79], 4) == False
    assert isTowerOfHanoiSolution(3, [(0, 2), (0, 1), (2, 1), (0, 2), (1, 0), (1, 2), (0, 2)]) == True
    assert isTowerOfHanoiSolution(3, [(0, 2), (0, 1), (0, 1), (0, 2), (1, 2), (1, 2)]) == False

if __name__ == "__main__":
    test()

# Bug: *360 instead of *180 in line 2
# Bug: `digit == num` instead of `str(digit) in str(num)` in line 5
# Bug: > instead of < in line 20
# Bug: `[[]]*3` instead of `[[], [], []]` in line 11