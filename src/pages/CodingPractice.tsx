import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FormattedMessage } from "@/components/FormattedMessage";
import {
    Code2, Play, Lightbulb, CheckCircle2, XCircle, Clock, Brain, Loader2, Search,
    Trophy, RefreshCw, ChevronLeft, BookOpen, Send, Terminal,
    Minimize2, Copy, RotateCcw, FileCode, History, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

import { generateJSON, streamChatWithGemini } from "@/lib/gemini";

interface Problem {
    id: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    topic: string;
    tags: string[];
    description: string;
    examples: { input: string; output: string; explanation?: string }[];
    constraints: string[];
    testCases: { input: string; expected: string }[];
    hints: string[];
    acceptance: number;
    submissions: number;
    solved: boolean;
    starterCode: Record<string, string>;
}

interface TestResult {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    runtime?: string;
}

interface Submission {
    id: string;
    status: "accepted" | "wrong_answer" | "runtime_error" | "time_limit";
    runtime: string;
    memory: string;
    language: string;
    timestamp: Date;
}

// Comprehensive problem set
const problems: Problem[] = [
    {
        id: "1", title: "Two Sum", difficulty: "easy", topic: "Arrays", tags: ["Array", "Hash Table"],
        description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
        examples: [
            { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
            { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
            { input: "nums = [3,3], target = 6", output: "[0,1]" }
        ],
        constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."],
        testCases: [
            { input: "[2,7,11,15], 9", expected: "[0,1]" },
            { input: "[3,2,4], 6", expected: "[1,2]" },
            { input: "[3,3], 6", expected: "[0,1]" }
        ],
        hints: ["A brute force approach would be O(n²). Can you do better?", "Try using a hash map to store values you've seen."],
        acceptance: 49.2, submissions: 12453, solved: false,
        starterCode: {
            python: `def twoSum(nums: list[int], target: int) -> list[int]:
    # Your code here
    pass`,
            javascript: `function twoSum(nums, target) {
    // Your code here
};`,
            java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here
    }
};`
        }
    },
    {
        id: "2", title: "Valid Parentheses", difficulty: "easy", topic: "Stack", tags: ["String", "Stack"],
        description: "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
        examples: [
            { input: 's = "()"', output: "true" },
            { input: 's = "()[]{}"', output: "true" },
            { input: 's = "(]"', output: "false" }
        ],
        constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
        testCases: [
            { input: "()", expected: "true" },
            { input: "()[]{}", expected: "true" },
            { input: "(]", expected: "false" }
        ],
        hints: ["Use a stack to track opening brackets.", "When you encounter a closing bracket, check if it matches the top of the stack."],
        acceptance: 42.8, submissions: 9876, solved: true,
        starterCode: {
            python: `def isValid(s: str) -> bool:
    # Your code here
    pass`,
            javascript: `function isValid(s) {
    // Your code here
};`,
            java: `class Solution {
    public boolean isValid(String s) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    bool isValid(string s) {
        // Your code here
    }
};`
        }
    },
    {
        id: "3", title: "Merge Two Sorted Lists", difficulty: "easy", topic: "Linked List", tags: ["Linked List", "Recursion"],
        description: "You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.",
        examples: [
            { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" },
            { input: "list1 = [], list2 = []", output: "[]" },
            { input: "list1 = [], list2 = [0]", output: "[0]" }
        ],
        constraints: ["The number of nodes in both lists is in the range [0, 50].", "-100 <= Node.val <= 100"],
        testCases: [
            { input: "[1,2,4], [1,3,4]", expected: "[1,1,2,3,4,4]" },
            { input: "[], []", expected: "[]" }
        ],
        hints: ["Use a dummy head to simplify the merge process.", "Compare the values and link nodes accordingly."],
        acceptance: 61.4, submissions: 8234, solved: false,
        starterCode: {
            python: `def mergeTwoLists(list1, list2):
    # Your code here
    pass`,
            javascript: `function mergeTwoLists(list1, list2) {
    // Your code here
};`,
            java: `class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        // Your code here
    }
};`
        }
    },
    {
        id: "4", title: "Best Time to Buy and Sell Stock", difficulty: "easy", topic: "Arrays", tags: ["Array", "Dynamic Programming"],
        description: "You are given an array `prices` where `prices[i]` is the price of a given stock on the `ith` day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.",
        examples: [
            { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5." },
            { input: "prices = [7,6,4,3,1]", output: "0", explanation: "No transactions are done and the max profit = 0." }
        ],
        constraints: ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
        testCases: [
            { input: "[7,1,5,3,6,4]", expected: "5" },
            { input: "[7,6,4,3,1]", expected: "0" }
        ],
        hints: ["Track the minimum price seen so far.", "Calculate profit at each step and track the maximum."],
        acceptance: 54.3, submissions: 15678, solved: false,
        starterCode: {
            python: `def maxProfit(prices: list[int]) -> int:
    # Your code here
    pass`,
            javascript: `function maxProfit(prices) {
    // Your code here
};`,
            java: `class Solution {
    public int maxProfit(int[] prices) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // Your code here
    }
};`
        }
    },
    {
        id: "5", title: "Maximum Subarray", difficulty: "medium", topic: "Arrays", tags: ["Array", "Divide and Conquer", "Dynamic Programming"],
        description: "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
        examples: [
            { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] has the largest sum 6." },
            { input: "nums = [1]", output: "1" },
            { input: "nums = [5,4,-1,7,8]", output: "23" }
        ],
        constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
        testCases: [
            { input: "[-2,1,-3,4,-1,2,1,-5,4]", expected: "6" },
            { input: "[1]", expected: "1" }
        ],
        hints: ["Consider Kadane's algorithm.", "At each position, decide whether to extend the previous subarray or start fresh."],
        acceptance: 50.1, submissions: 11234, solved: false,
        starterCode: {
            python: `def maxSubArray(nums: list[int]) -> int:
    # Your code here
    pass`,
            javascript: `function maxSubArray(nums) {
    // Your code here
};`,
            java: `class Solution {
    public int maxSubArray(int[] nums) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Your code here
    }
};`
        }
    },
    {
        id: "6", title: "Climbing Stairs", difficulty: "easy", topic: "Dynamic Programming", tags: ["Math", "Dynamic Programming", "Memoization"],
        description: "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
        examples: [
            { input: "n = 2", output: "2", explanation: "There are two ways: 1+1 and 2." },
            { input: "n = 3", output: "3", explanation: "1+1+1, 1+2, 2+1" }
        ],
        constraints: ["1 <= n <= 45"],
        testCases: [
            { input: "2", expected: "2" },
            { input: "3", expected: "3" },
            { input: "4", expected: "5" }
        ],
        hints: ["This is a classic Fibonacci problem.", "ways(n) = ways(n-1) + ways(n-2)"],
        acceptance: 51.8, submissions: 7654, solved: false,
        starterCode: {
            python: `def climbStairs(n: int) -> int:
    # Your code here
    pass`,
            javascript: `function climbStairs(n) {
    // Your code here
};`,
            java: `class Solution {
    public int climbStairs(int n) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    int climbStairs(int n) {
        // Your code here
    }
};`
        }
    },
    {
        id: "7", title: "Binary Search", difficulty: "easy", topic: "Binary Search", tags: ["Array", "Binary Search"],
        description: "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.",
        examples: [
            { input: "nums = [-1,0,3,5,9,12], target = 9", output: "4" },
            { input: "nums = [-1,0,3,5,9,12], target = 2", output: "-1" }
        ],
        constraints: ["1 <= nums.length <= 10^4", "-10^4 < nums[i], target < 10^4", "All integers in nums are unique.", "nums is sorted in ascending order."],
        testCases: [
            { input: "[-1,0,3,5,9,12], 9", expected: "4" },
            { input: "[-1,0,3,5,9,12], 2", expected: "-1" }
        ],
        hints: ["Divide the search space in half each iteration."],
        acceptance: 55.7, submissions: 6543, solved: false,
        starterCode: {
            python: `def search(nums: list[int], target: int) -> int:
    # Your code here
    pass`,
            javascript: `function search(nums, target) {
    // Your code here
};`,
            java: `class Solution {
    public int search(int[] nums, int target) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        // Your code here
    }
};`
        }
    },
    {
        id: "8", title: "Reverse Linked List", difficulty: "easy", topic: "Linked List", tags: ["Linked List", "Recursion"],
        description: "Given the `head` of a singly linked list, reverse the list, and return the reversed list.",
        examples: [
            { input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]" },
            { input: "head = [1,2]", output: "[2,1]" }
        ],
        constraints: ["The number of nodes in the list is the range [0, 5000].", "-5000 <= Node.val <= 5000"],
        testCases: [
            { input: "[1,2,3,4,5]", expected: "[5,4,3,2,1]" },
            { input: "[1,2]", expected: "[2,1]" }
        ],
        hints: ["Use three pointers: prev, curr, next.", "Can also be solved recursively."],
        acceptance: 72.5, submissions: 9876, solved: false,
        starterCode: {
            python: `def reverseList(head):
    # Your code here
    pass`,
            javascript: `function reverseList(head) {
    // Your code here
};`,
            java: `class Solution {
    public ListNode reverseList(ListNode head) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        // Your code here
    }
};`
        }
    },
    {
        id: "9", title: "Longest Substring Without Repeating Characters", difficulty: "medium", topic: "Strings", tags: ["Hash Table", "String", "Sliding Window"],
        description: "Given a string `s`, find the length of the longest substring without repeating characters.",
        examples: [
            { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", with the length of 3.' },
            { input: 's = "bbbbb"', output: "1" },
            { input: 's = "pwwkew"', output: "3" }
        ],
        constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."],
        testCases: [
            { input: "abcabcbb", expected: "3" },
            { input: "bbbbb", expected: "1" },
            { input: "pwwkew", expected: "3" }
        ],
        hints: ["Use a sliding window approach.", "Use a set or hash map to track characters in the current window."],
        acceptance: 33.8, submissions: 14567, solved: false,
        starterCode: {
            python: `def lengthOfLongestSubstring(s: str) -> int:
    # Your code here
    pass`,
            javascript: `function lengthOfLongestSubstring(s) {
    // Your code here
};`,
            java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Your code here
    }
};`
        }
    },
    {
        id: "10", title: "Container With Most Water", difficulty: "medium", topic: "Arrays", tags: ["Array", "Two Pointers", "Greedy"],
        description: "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `ith` line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.",
        examples: [
            { input: "height = [1,8,6,2,5,4,8,3,7]", output: "49" },
            { input: "height = [1,1]", output: "1" }
        ],
        constraints: ["n == height.length", "2 <= n <= 10^5", "0 <= height[i] <= 10^4"],
        testCases: [
            { input: "[1,8,6,2,5,4,8,3,7]", expected: "49" },
            { input: "[1,1]", expected: "1" }
        ],
        hints: ["Use two pointers at the start and end.", "Move the pointer with smaller height inward."],
        acceptance: 54.2, submissions: 8765, solved: false,
        starterCode: {
            python: `def maxArea(height: list[int]) -> int:
    # Your code here
    pass`,
            javascript: `function maxArea(height) {
    // Your code here
};`,
            java: `class Solution {
    public int maxArea(int[] height) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    int maxArea(vector<int>& height) {
        // Your code here
    }
};`
        }
    },
    {
        id: "11", title: "3Sum", difficulty: "medium", topic: "Arrays", tags: ["Array", "Two Pointers", "Sorting"],
        description: "Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
        examples: [
            { input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]" },
            { input: "nums = [0,1,1]", output: "[]" },
            { input: "nums = [0,0,0]", output: "[[0,0,0]]" }
        ],
        constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
        testCases: [
            { input: "[-1,0,1,2,-1,-4]", expected: "[[-1,-1,2],[-1,0,1]]" },
            { input: "[0,0,0]", expected: "[[0,0,0]]" }
        ],
        hints: ["Sort the array first.", "Use two pointers after fixing one element."],
        acceptance: 32.4, submissions: 12345, solved: false,
        starterCode: {
            python: `def threeSum(nums: list[int]) -> list[list[int]]:
    # Your code here
    pass`,
            javascript: `function threeSum(nums) {
    // Your code here
};`,
            java: `class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        // Your code here
    }
};`
        }
    },
    {
        id: "12", title: "LRU Cache", difficulty: "hard", topic: "Design", tags: ["Hash Table", "Linked List", "Design", "Doubly-Linked List"],
        description: "Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.\n\nImplement the `LRUCache` class:\n- `LRUCache(int capacity)` Initialize the LRU cache with positive size capacity.\n- `int get(int key)` Return the value of the key if exists, otherwise return -1.\n- `void put(int key, int value)` Update the value if exists. Otherwise, add the key-value pair. If the number of keys exceeds capacity, evict the least recently used key.",
        examples: [
            { input: "[\"LRUCache\", \"put\", \"put\", \"get\", \"put\", \"get\", \"put\", \"get\", \"get\", \"get\"]", output: "[null, null, null, 1, null, -1, null, -1, 3, 4]" }
        ],
        constraints: ["1 <= capacity <= 3000", "0 <= key <= 10^4", "0 <= value <= 10^5", "At most 2 * 10^5 calls will be made to get and put."],
        testCases: [
            { input: "capacity=2, operations=[put(1,1),put(2,2),get(1),put(3,3),get(2)]", expected: "[null,null,1,null,-1]" }
        ],
        hints: ["Use a hash map combined with a doubly linked list.", "The hash map gives O(1) access, the linked list maintains order."],
        acceptance: 40.5, submissions: 5678, solved: false,
        starterCode: {
            python: `class LRUCache:
    def __init__(self, capacity: int):
        pass
    def get(self, key: int) -> int:
        pass
    def put(self, key: int, value: int) -> None:
        pass`,
            javascript: `class LRUCache {
    constructor(capacity) {
    }
    get(key) {
    }
    put(key, value) {
    }
}`,
            java: `class LRUCache {
    public LRUCache(int capacity) {
    }
    public int get(int key) {
    }
    public void put(int key, int value) {
    }
}`,
            cpp: `class LRUCache {
public:
    LRUCache(int capacity) {
    }
    int get(int key) {
    }
    void put(int key, int value) {
    }
};`
        }
    },
    {
        id: "13", title: "Trapping Rain Water", difficulty: "hard", topic: "Arrays", tags: ["Array", "Two Pointers", "Dynamic Programming", "Stack"],
        description: "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.",
        examples: [
            { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" },
            { input: "height = [4,2,0,3,2,5]", output: "9" }
        ],
        constraints: ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"],
        testCases: [
            { input: "[0,1,0,2,1,0,1,3,2,1,2,1]", expected: "6" },
            { input: "[4,2,0,3,2,5]", expected: "9" }
        ],
        hints: ["For each position, water trapped = min(maxLeft, maxRight) - height.", "Use two-pointer approach for O(1) space."],
        acceptance: 58.7, submissions: 4567, solved: false,
        starterCode: {
            python: `def trap(height: list[int]) -> int:
    # Your code here
    pass`,
            javascript: `function trap(height) {
    // Your code here
};`,
            java: `class Solution {
    public int trap(int[] height) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    int trap(vector<int>& height) {
        // Your code here
    }
};`
        }
    },
    {
        id: "14", title: "Word Search", difficulty: "medium", topic: "Backtracking", tags: ["Array", "Backtracking", "Matrix"],
        description: "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.",
        examples: [
            { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"', output: "true" },
            { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"', output: "true" }
        ],
        constraints: ["m == board.length", "n = board[i].length", "1 <= m, n <= 6", "1 <= word.length <= 15"],
        testCases: [
            { input: '[["A","B"],["C","D"]], "ABCD"', expected: "false" },
            { input: '[["A","B"],["C","D"]], "ABDC"', expected: "true" }
        ],
        hints: ["Use DFS with backtracking.", "Mark cells as visited during exploration."],
        acceptance: 40.2, submissions: 7890, solved: false,
        starterCode: {
            python: `def exist(board: list[list[str]], word: str) -> bool:
    # Your code here
    pass`,
            javascript: `function exist(board, word) {
    // Your code here
};`,
            java: `class Solution {
    public boolean exist(char[][] board, String word) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    bool exist(vector<vector<char>>& board, string word) {
        // Your code here
    }
};`
        }
    },
    {
        id: "15", title: "Number of Islands", difficulty: "medium", topic: "Graph", tags: ["Array", "DFS", "BFS", "Union Find", "Matrix"],
        description: "Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.",
        examples: [
            { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: "1" },
            { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: "3" }
        ],
        constraints: ["m == grid.length", "n == grid[i].length", "1 <= m, n <= 300", "grid[i][j] is '0' or '1'."],
        testCases: [
            { input: '[["1","1","0"],["0","1","0"],["0","0","1"]]', expected: "2" },
            { input: '[["1","0"],["0","1"]]', expected: "2" }
        ],
        hints: ["Use DFS or BFS to traverse connected land cells.", "Mark visited cells to avoid counting twice."],
        acceptance: 56.3, submissions: 11234, solved: false,
        starterCode: {
            python: `def numIslands(grid: list[list[str]]) -> int:
    # Your code here
    pass`,
            javascript: `function numIslands(grid) {
    // Your code here
};`,
            java: `class Solution {
    public int numIslands(char[][] grid) {
        // Your code here
    }
}`,
            cpp: `class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        // Your code here
    }
};`
        }
    }
];

const topics = ["All", "Arrays", "Strings", "Linked List", "Stack", "Binary Search", "Dynamic Programming", "Graph", "Backtracking", "Design"];
const difficulties = ["All", "easy", "medium", "hard"];
const languages = ["python", "javascript", "java", "cpp"];

export default function CodingPractice() {
    const { user } = useAuth();
    const [problemList, setProblemList] = useState<Problem[]>(problems);
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
    const [selectedTopic, setSelectedTopic] = useState("All");
    const [selectedDifficulty, setSelectedDifficulty] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("python");
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testResults, setTestResults] = useState<TestResult[] | null>(null);
    const [activeTab, setActiveTab] = useState("description");
    const [consoleOutput, setConsoleOutput] = useState("");
    const [showConsole, setShowConsole] = useState(false);
    const [hint, setHint] = useState("");
    const [isGettingHint, setIsGettingHint] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const codeRef = useRef<HTMLTextAreaElement>(null);

    const filteredProblems = problemList.filter(p => {
        const matchesTopic = selectedTopic === "All" || p.topic === selectedTopic;
        const matchesDifficulty = selectedDifficulty === "All" || p.difficulty === selectedDifficulty;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesTopic && matchesDifficulty && matchesSearch;
    });

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case "easy": return "text-green-500 bg-green-500/10 border-green-500/30";
            case "medium": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
            case "hard": return "text-red-500 bg-red-500/10 border-red-500/30";
            default: return "";
        }
    };

    const handleProblemSelect = (problem: Problem) => {
        setSelectedProblem(problem);
        setCode(problem.starterCode[language] || "");
        setTestResults(null);
        setHint("");
        setAnalysis(null);
        setConsoleOutput("");
        setActiveTab("description");
    };

    const handleLanguageChange = (lang: string) => {
        setLanguage(lang);
        if (selectedProblem) {
            setCode(selectedProblem.starterCode[lang] || "");
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        toast.success("Code copied!");
    };

    const runCode = async () => {
        if (!selectedProblem || !code.trim()) {
            toast.error("Please write some code first");
            return;
        }

        setIsRunning(true);
        setTestResults(null);
        setConsoleOutput("Running code...\n");
        setShowConsole(true);

        try {
            const prompt = `Analyze the following ${language} code for the problem described below.

Problem: ${selectedProblem.title}
${selectedProblem.description}

Code:
\`\`\`${language}
${code}
\`\`\`

Test Cases:
${selectedProblem.testCases.map((tc, i) => `Test ${i + 1}: Input: ${tc.input} → Expected: ${tc.expected}`).join('\n')}

Analyze the code and return ONLY valid JSON (no markdown):
{
  "all_passed": boolean,
  "syntax_error": null or "error description",
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "test_results": [
    {
      "input": "test input",
      "expected_output": "expected",
      "actual_output": "what the code would produce",
      "passed": boolean
    }
  ]
}`;

            const result = await generateJSON<any>(
                prompt,
                "You are an expert code evaluator. Analyze the code, trace through logic mentally for each test case, and determine the output. Be accurate in your analysis.",
                { temperature: 0.2 }
            );

            const results: TestResult[] = (result.test_results || []).map((r: any) => ({
                input: r.input,
                expected: r.expected_output,
                actual: r.actual_output,
                passed: r.passed,
                runtime: "5ms"
            }));
            setTestResults(results);
            setAnalysis(result);
            setConsoleOutput(prev => prev + `\nExecution completed.\nTime: ${result.time_complexity || "N/A"}\nSpace: ${result.space_complexity || "N/A"}`);

            if (result.all_passed) {
                toast.success("All test cases passed! 🎉");
            } else if (result.syntax_error) {
                setConsoleOutput(prev => prev + `\n❌ Syntax Error: ${result.syntax_error}`);
                toast.error("Syntax Error");
            } else {
                const passed = results.filter(r => r.passed).length;
                toast.warning(`${passed}/${results.length} test cases passed`);
            }
        } catch (error: any) {
            // Fallback: show test cases when any error occurs
            const simulatedResults: TestResult[] = selectedProblem.testCases.map((tc) => ({
                input: tc.input,
                expected: tc.expected,
                actual: "(Verify locally)",
                passed: false,
                runtime: "N/A"
            }));
            setTestResults(simulatedResults);
            setConsoleOutput(prev => prev + `\n⚠️ Could not analyze code. Test cases shown for reference.`);
            toast.info("Test cases shown - verify locally");
        } finally {
            setIsRunning(false);
        }
    };

    const submitCode = async () => {
        if (!selectedProblem) return;
        setIsSubmitting(true);
        await runCode();

        if (testResults && testResults.every(r => r.passed)) {
            setProblemList(prev => prev.map(p =>
                p.id === selectedProblem.id ? { ...p, solved: true } : p
            ));
            const newSubmission: Submission = {
                id: crypto.randomUUID(),
                status: "accepted",
                runtime: "24 ms",
                memory: "16.2 MB",
                language,
                timestamp: new Date()
            };
            setSubmissions(prev => [newSubmission, ...prev]);
            toast.success("Solution Accepted!");
        }
        setIsSubmitting(false);
    };

    const getHint = async () => {
        if (!selectedProblem) return;
        setIsGettingHint(true);
        setHint("");

        try {
            await streamChatWithGemini(
                [{ role: "user", content: `Give me a hint for this coding problem: ${selectedProblem.title}\n\n${selectedProblem.description}\n\nDon't give the full solution, just a helpful hint about the approach or algorithm to use.` }],
                "You are a coding tutor. Give helpful hints without revealing the full solution. Focus on the algorithmic approach.",
                (_chunk, fullText) => {
                    setHint(fullText);
                }
            );
        } catch (error: any) {
            toast.error("Failed to get hint");
        } finally {
            setIsGettingHint(false);
        }
    };

    const solvedCount = problemList.filter(p => p.solved).length;

    // Problem List View
    if (!selectedProblem) {
        return (
            <div className="flex flex-col h-full bg-background">
                {/* Header - Gradient Styled */}
                <div className="p-6 border-b border-border bg-gradient-to-r from-[hsl(var(--gradient-start)/0.08)] via-[hsl(var(--gradient-mid)/0.05)] to-[hsl(var(--gradient-end)/0.08)]">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] flex items-center justify-center shadow-lg shadow-[hsl(var(--gradient-start)/0.3)]">
                            <Code2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">Coding Practice</h1>
                            <p className="text-muted-foreground">LeetCode-style problems • Sharpen your algorithmic skills</p>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            <span className="font-semibold">{solvedCount}</span>
                            <span className="text-muted-foreground">/ {problemList.length} Solved</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-green-500/20 text-green-500">{problemList.filter(p => p.difficulty === "easy").length} Easy</Badge>
                            <Badge className="bg-yellow-500/20 text-yellow-500">{problemList.filter(p => p.difficulty === "medium").length} Medium</Badge>
                            <Badge className="bg-red-500/20 text-red-500">{problemList.filter(p => p.difficulty === "hard").length} Hard</Badge>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-border/50 flex flex-wrap gap-3 bg-card/20">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search problems or tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{difficulties.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

                {/* Problem Table */}
                <ScrollArea className="flex-1">
                    <div className="p-4">
                        <div className="rounded-lg border border-border overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr className="text-left text-sm text-muted-foreground">
                                        <th className="p-3 w-12">Status</th>
                                        <th className="p-3">Title</th>
                                        <th className="p-3 w-32">Difficulty</th>
                                        <th className="p-3 w-24">Topic</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProblems.map((problem, idx) => (
                                        <tr key={problem.id} onClick={() => handleProblemSelect(problem)}
                                            className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors">
                                            <td className="p-3">
                                                {problem.solved ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <div className="w-5 h-5" />}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-medium hover:text-primary transition-colors">{idx + 1}. {problem.title}</div>
                                                <div className="flex gap-1 mt-1">{problem.tags.slice(0, 3).map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}</div>
                                            </td>
                                            <td className="p-3"><Badge className={cn("capitalize", getDifficultyColor(problem.difficulty))}>{problem.difficulty}</Badge></td>
                                            <td className="p-3 text-sm text-muted-foreground">{problem.topic}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        );
    }

    // Problem Detail View (LeetCode Style)
    return (
        <div className="flex flex-col h-full overflow-hidden bg-background">
            {/* Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-card/50">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedProblem(null)} className="gap-1">
                        <ChevronLeft className="w-4 h-4" /> Problems
                    </Button>
                    <Separator orientation="vertical" className="h-5" />
                    <span className="font-medium">{selectedProblem.title}</span>
                    <Badge className={cn("capitalize", getDifficultyColor(selectedProblem.difficulty))}>{selectedProblem.difficulty}</Badge>
                    {selectedProblem.solved && <Badge className="bg-green-500/20 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Solved</Badge>}
                </div>
                <div className="flex items-center gap-2">
                    <Select value={language} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{languages.map(l => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Problem Description */}
                <div className="w-1/2 border-r border-border flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <TabsList className="mx-4 mt-2 justify-start bg-transparent border-b border-border rounded-none h-auto p-0">
                            <TabsTrigger value="description" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-1">
                                <BookOpen className="w-4 h-4" /> Description
                            </TabsTrigger>
                            <TabsTrigger value="solutions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-1">
                                <Lightbulb className="w-4 h-4" /> Hints
                            </TabsTrigger>
                            <TabsTrigger value="submissions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-1">
                                <History className="w-4 h-4" /> Submissions
                            </TabsTrigger>
                        </TabsList>

                        <ScrollArea className="flex-1">
                            <TabsContent value="description" className="p-4 m-0 space-y-6">
                                <div className="prose prose-invert max-w-none">
                                    <FormattedMessage content={selectedProblem.description} />
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-3">Examples</h3>
                                    {selectedProblem.examples.map((ex, i) => (
                                        <div key={i} className="mb-4 p-4 rounded-lg bg-muted/50 border border-border">
                                            <div className="font-medium text-sm mb-2">Example {i + 1}:</div>
                                            <div className="font-mono text-sm space-y-1">
                                                <div><span className="text-muted-foreground">Input:</span> {ex.input}</div>
                                                <div><span className="text-muted-foreground">Output:</span> {ex.output}</div>
                                                {ex.explanation && <div className="text-muted-foreground text-xs mt-2">{ex.explanation}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Constraints</h3>
                                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                        {selectedProblem.constraints.map((c, i) => <li key={i} className="font-mono">{c}</li>)}
                                    </ul>
                                </div>
                            </TabsContent>

                            <TabsContent value="solutions" className="p-4 m-0">
                                {!hint ? (
                                    <div className="text-center py-12">
                                        <Lightbulb className="w-16 h-16 text-yellow-500 mx-auto mb-4 opacity-50" />
                                        <h3 className="font-semibold mb-2">Need a hint?</h3>
                                        <p className="text-muted-foreground mb-4 text-sm">Get an AI-powered hint without spoiling the solution</p>
                                        <Button onClick={getHint} disabled={isGettingHint} className="gap-2">
                                            {isGettingHint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            {isGettingHint ? "Thinking..." : "Get Hint"}
                                        </Button>
                                        {selectedProblem.hints.length > 0 && (
                                            <div className="mt-8 space-y-3">{selectedProblem.hints.map((h, i) => (
                                                <div key={i} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-left text-sm">
                                                    <span className="font-medium text-yellow-500">Hint {i + 1}:</span> {h}
                                                </div>
                                            ))}</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                        <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-5 h-5 text-yellow-500" /><span className="font-semibold">AI Hint</span></div>
                                        <FormattedMessage content={hint} />
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="submissions" className="p-4 m-0">
                                {submissions.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                        <p>No submissions yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">{submissions.map(sub => (
                                        <div key={sub.id} className={cn("p-3 rounded-lg border", sub.status === "accepted" ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20")}>
                                            <div className="flex items-center justify-between">
                                                <Badge className={sub.status === "accepted" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                                                    {sub.status === "accepted" ? "Accepted" : "Wrong Answer"}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">{sub.timestamp.toLocaleString()}</span>
                                            </div>
                                            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                                <span><Clock className="w-3 h-3 inline mr-1" />{sub.runtime}</span>
                                                <span><Brain className="w-3 h-3 inline mr-1" />{sub.memory}</span>
                                                <span className="capitalize">{sub.language}</span>
                                            </div>
                                        </div>
                                    ))}</div>
                                )}
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </div>

                {/* Right Panel - Code Editor */}
                <div className="w-1/2 flex flex-col">
                    {/* Code Editor Header */}
                    <div className="h-10 flex items-center justify-between px-3 border-b border-border bg-muted/30">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileCode className="w-4 h-4" />
                            <span className="capitalize">{language}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyCode}><Copy className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCode(selectedProblem.starterCode[language] || "")}><RotateCcw className="w-3.5 h-3.5" /></Button>
                        </div>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1 overflow-hidden min-h-0">
                        <textarea
                            ref={codeRef}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={(e) => {
                                // Tab key inserts 4 spaces instead of changing focus
                                if (e.key === "Tab") {
                                    e.preventDefault();
                                    const target = e.target as HTMLTextAreaElement;
                                    const start = target.selectionStart;
                                    const end = target.selectionEnd;
                                    const spaces = "    ";
                                    const newCode = code.substring(0, start) + spaces + code.substring(end);
                                    setCode(newCode);
                                    // Restore cursor position after state update
                                    requestAnimationFrame(() => {
                                        target.selectionStart = target.selectionEnd = start + spaces.length;
                                    });
                                }
                                // Enter key auto-indents to match previous line
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    const target = e.target as HTMLTextAreaElement;
                                    const start = target.selectionStart;
                                    const beforeCursor = code.substring(0, start);
                                    const currentLine = beforeCursor.split("\n").pop() || "";
                                    const indent = currentLine.match(/^\s*/)?.[0] || "";
                                    // Add extra indent if line ends with : or {
                                    const extraIndent = /[:{]\s*$/.test(currentLine.trimEnd()) ? "    " : "";
                                    const insertion = "\n" + indent + extraIndent;
                                    const newCode = code.substring(0, start) + insertion + code.substring(target.selectionEnd);
                                    setCode(newCode);
                                    requestAnimationFrame(() => {
                                        target.selectionStart = target.selectionEnd = start + insertion.length;
                                    });
                                }
                            }}
                            className="w-full h-full resize-none border-0 outline-none font-mono text-sm p-4 text-foreground"
                            style={{
                                lineHeight: "1.6",
                                backgroundColor: "hsl(var(--muted) / 0.3)",
                                tabSize: 4,
                                caretColor: "hsl(var(--primary))",
                            }}
                            spellCheck={false}
                            autoCapitalize="off"
                            autoCorrect="off"
                            autoComplete="off"
                            placeholder="Write your code here..."
                        />
                    </div>

                    {/* Test Results / Console */}
                    {showConsole && (
                        <div className="h-48 border-t border-border flex flex-col">
                            <div className="h-8 flex items-center justify-between px-3 bg-muted/30 border-b border-border">
                                <div className="flex items-center gap-2 text-sm"><Terminal className="w-4 h-4" /> Console</div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowConsole(false)}><Minimize2 className="w-3 h-3" /></Button>
                            </div>
                            <ScrollArea className="flex-1 p-3">
                                {testResults ? (
                                    <div className="space-y-2">
                                        {testResults.map((r, i) => (
                                            <div key={i} className={cn("p-2 rounded text-sm flex items-start gap-2", r.passed ? "bg-green-500/10" : "bg-red-500/10")}>
                                                {r.passed ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                                                <div className="flex-1 font-mono text-xs">
                                                    <div>Test {i + 1}: {r.passed ? "Passed" : "Failed"}</div>
                                                    {!r.passed && <><div className="text-muted-foreground">Expected: {r.expected}</div><div className="text-red-400">Got: {r.actual}</div></>}
                                                </div>
                                            </div>
                                        ))}
                                        {analysis && (
                                            <div className="flex gap-2 mt-3 text-xs">
                                                {analysis.time_complexity && <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{analysis.time_complexity}</Badge>}
                                                {analysis.space_complexity && <Badge variant="outline"><Brain className="w-3 h-3 mr-1" />{analysis.space_complexity}</Badge>}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{consoleOutput}</pre>
                                )}
                            </ScrollArea>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="h-12 flex items-center justify-between px-4 border-t border-border bg-card/50">
                        <Button variant="ghost" size="sm" onClick={() => setShowConsole(!showConsole)} className="gap-1 text-muted-foreground">
                            <Terminal className="w-4 h-4" /> Console
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={runCode} disabled={isRunning} className="gap-2">
                                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                Run
                            </Button>
                            <Button onClick={submitCode} disabled={isSubmitting} className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Submit
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
