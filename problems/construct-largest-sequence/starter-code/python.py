import heapq
import sys


def solve() -> None:
    data = sys.stdin.read().strip().split()
    if not data:
        return

    n = int(data[0])
    values = list(map(int, data[1 : 1 + n]))
    state = data[1 + n]
    m = int(data[2 + n])

    # Implement constructLargestSequence(values, state, m).
    # Print the selected values separated by spaces.
    #
    # Example:
    # print("6 7")


if __name__ == "__main__":
    solve()
