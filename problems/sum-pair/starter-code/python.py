import sys


def solve() -> None:
    data = sys.stdin.read().strip().split()
    if not data:
        return

    n = int(data[0])
    nums = list(map(int, data[1 : 1 + n]))
    target = int(data[1 + n])

    # Write your solution here.
    # Example:
    # print("0 1")


if __name__ == "__main__":
    solve()
