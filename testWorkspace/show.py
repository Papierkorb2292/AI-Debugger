class StringRange():
    def __init__(self, start, end):
        self.start = start
        self.end = end

    def __eq__(self, other):
        return self.start == other.start and self.end == other.end
        
    def __hash__(self):
        return hash((self.start, self.end))

def get_parenthese_ranges(string: str):
    rangeStart = 0
    ranges = set()
    for i, char in enumerate(string):
        if char == "(":
            rangeStart = i
        elif char == ")":
            ranges.add(StringRange(rangeStart, i))
    return ranges

def tests():
    assert get_parenthese_ranges("(())") == { StringRange(1, 2), StringRange(0, 3)}

if __name__ == '__main__':
    tests()