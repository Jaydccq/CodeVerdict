import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int n = scanner.nextInt();
        long[] values = new long[n];
        for (int i = 0; i < n; i++) {
            values[i] = scanner.nextLong();
        }
        String state = scanner.next();
        int m = scanner.nextInt();

        // Implement constructLargestSequence(values, state, m).
        // Print the selected values separated by spaces.

        scanner.close();
    }
}
