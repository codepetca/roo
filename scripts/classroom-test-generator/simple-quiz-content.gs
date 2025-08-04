/**
 * Simple Python quiz content without problematic code examples
 * Location: simple-quiz-content.gs
 */

/**
 * Perfect student Quiz: Python Fundamentals content - simplified
 */
function getPerfectTestContentSimple() {
  return `Quiz: Python Fundamentals - Perfect Student Submission

Student Name: Perfect Student
Assignment: Quiz: Python Fundamentals
Date: January 2025

QUESTION 1: What is the difference between a list and a tuple in Python?

ANSWER: Lists and tuples are both sequence data types in Python, but have fundamental differences:

Lists:
- Mutable (can be modified after creation)
- Defined with square brackets [1, 2, 3]
- Methods available: append(), remove(), extend(), pop(), etc.
- Example: my_list = [1, 2, 3] then my_list.append(4)

Tuples:
- Immutable (cannot be modified after creation)
- Defined with parentheses (1, 2, 3)
- More memory efficient and faster than lists
- Example: my_tuple = (1, 2, 3) - cannot modify elements

Key Differences:
1. Mutability: Lists can be changed, tuples cannot
2. Performance: Tuples are faster for accessing elements
3. Memory: Tuples use less memory
4. Use cases: Lists for collections that change, tuples for fixed data
5. Dictionary keys: Tuples can be dictionary keys, lists cannot

QUESTION 2: Explain Python's indentation rules and why they matter.

ANSWER: Python uses indentation (whitespace at the beginning of lines) to define code blocks and structure, making it syntactically significant unlike most programming languages.

Python Indentation Rules:
1. Consistent indentation: All lines at the same level must have identical indentation
2. Standard practice: Use 4 spaces per indentation level (PEP 8 standard)
3. No mixing: Don't mix tabs and spaces (causes IndentationError)
4. Block definition: Indentation creates code blocks for functions, classes, conditionals, loops, exception handling

Why Indentation Matters:
1. Readability: Forces clean, visually organized code
2. Syntax enforcement: Prevents common programming errors
3. Code maintenance: Easier to understand and modify
4. Collaboration: Team code looks uniform

QUESTION 3: How do Python functions work and what are their key features?

ANSWER: Python functions are reusable blocks of code that perform specific tasks, accept input parameters, and can return values. They are defined using the def keyword.

Key Features:
- Functions start with def keyword followed by function name and parameters
- Function body is indented and can include optional return statement
- Can accept parameters with default values
- Can return single values, multiple values as tuples, or no value
- Support variable arguments using *args and **kwargs
- Have local scope for variables defined inside them

Benefits:
- Code reusability and modularity
- Easier testing and debugging
- Better code organization and readability
- Abstraction of implementation details

QUESTION 4: What are Python's main data types and how do you work with them?

ANSWER: Python has several built-in data types for storing and manipulating different kinds of information.

Numeric Data Types:
- int: Whole numbers (age = 25)
- float: Decimal numbers (price = 19.99)
- complex: Complex numbers (3 + 4j)

Text Data Type:
- str: Text data in quotes (name = "Alice")

Boolean Data Type:
- bool: True or False values

Collection Data Types:
- list: Ordered, mutable collections [1, 2, 3]
- tuple: Ordered, immutable collections (1, 2, 3)
- dict: Key-value pairs {"name": "Alice", "age": 20}
- set: Unordered collections of unique elements {1, 2, 3}

Type Operations:
- Check type: type(variable)
- Convert types: str(42), int("42"), float(42)
- Dynamic typing: Variables can change types during execution

QUESTION 5: What are Python modules and how do you import and use them?

ANSWER: Python modules are files containing Python code that can be imported and used in other programs. They provide code reusability and help organize large programs.

Types of Modules:
1. Built-in modules: Come with Python (math, random, datetime)
2. Standard library: Official Python modules (json, urllib, sqlite3)
3. Third-party: Installed via pip (requests, numpy, pandas)
4. Custom: Your own .py files

Importing Methods:
1. Import entire module: import math, then use math.sqrt(16)
2. Import specific functions: from math import sqrt, then use sqrt(16)
3. Import with alias: import math as m, then use m.sqrt(16)
4. Import all (not recommended): from math import *

Benefits:
- Code reusability across multiple programs
- Better organization and namespace management
- Access to extensive Python ecosystem
- Easier maintenance and collaboration

Score Expectation: 95-100% - Demonstrates comprehensive understanding with detailed explanations.`;
}

/**
 * Imperfect student Quiz: Python Fundamentals content - simplified
 */
function getImperfectTestContentSimple() {
  return `Quiz: Python Fundamentals - Imperfect Student Submission

Student Name: Struggling Student
Assignment: Quiz: Python Fundamentals
Date: January 2025

1. What is the difference between a list and a tuple in Python?

Lists and tuples are both like containers that hold stuff in Python. The main difference is that lists use square brackets [] and tuples use parentheses (). 

Lists are changeable so you can add and remove things from them, but tuples can't be changed once you make them. I think lists are better because you can do more stuff with them.

I always get confused about when to use which one though. My teacher said something about tuples being faster but I don't really understand why.

2. Explain Python's indentation rules and why they matter.

Python is really picky about indentation which is super annoying. You have to put spaces at the beginning of lines and they all have to match up or Python will give you errors.

I think you're supposed to use 4 spaces but sometimes I use tabs and it still works. The main thing is that everything at the same level has to line up or the program won't run.

It's different from other languages that use curly braces but I guess it makes the code look cleaner. I still make indentation errors all the time though.

3. How do Python functions work and what are their key features?

Functions in Python start with def and then you put the name of the function. You can pass things to them and they can return things back.

Basic function: def my_function(): print("hello")
Function with parameters: def add_numbers(a, b): return a + b

I think Python functions are easier than other languages because you don't have to declare types and stuff. But I still get confused about parameters vs arguments and when to use return.

4. What are Python's main data types and how do you work with them?

Python has different types of data like numbers, words, and lists. 

- int is for whole numbers like 5
- float is for decimal numbers like 3.14
- str is for text like "hello"
- bool is for True/False

You can change types with functions like int() and str(). Sometimes Python does it automatically which is nice but also confusing when you don't expect it.

Lists are for multiple things like [1, 2, 3] and dictionaries are like lists but with names instead of numbers to find things.

5. What are Python modules and how do you import and use them?

Modules are like extra code that other people wrote that you can use in your programs. You use import to get them.

Example: import math, then print(math.sqrt(16))

That imports the math module and then you can use math functions. There's also "from math import sqrt" but I always forget which way to do it.

I know there's lots of modules like random and datetime but I haven't learned very many yet. You can also install new ones with pip but I haven't figured that out.

Major Issues with this submission:
1. Vague explanations without technical depth
2. Missing proper examples and syntax
3. Informal language inappropriate for academic submission
4. Some incorrect information and misconceptions
5. Lacks comprehensive understanding of concepts

Score Expectation: 60-70% - Shows basic understanding but lacks depth and precision.`;
}

/**
 * Perfect student Quiz: Programming Concepts content
 */
function getPerfectProgrammingConceptsContent() {
  return `Quiz: Programming Concepts - Perfect Student Submission

Student Name: Perfect Student
Assignment: Quiz: Programming Concepts
Date: January 2025

QUESTION 1: What is object-oriented programming and what are its key principles?

ANSWER: Object-oriented programming (OOP) is a programming paradigm that organizes code into objects that contain both data (attributes) and methods (functions). The four key principles are:

1. **Encapsulation**: Bundling data and methods together within a class, hiding internal implementation details from outside access. This promotes data security and code maintainability.

2. **Inheritance**: Creating new classes based on existing classes, allowing code reuse and establishing hierarchical relationships. Child classes inherit attributes and methods from parent classes.

3. **Polymorphism**: The ability for different objects to respond to the same method call in their own specific way. This allows for flexible and extensible code design.

4. **Abstraction**: Hiding complex implementation details while exposing only essential features through simplified interfaces. This reduces complexity and improves code usability.

Benefits include improved code organization, reusability, maintainability, and scalability for large software projects.

QUESTION 2: Explain error handling in programming. What are try-catch blocks?

ANSWER: Error handling is the process of anticipating, catching, and managing runtime errors that may occur during program execution, preventing crashes and providing graceful failure recovery.

Try-catch blocks are structured error handling mechanisms:
- **Try block**: Contains code that might raise an exception
- **Catch/Except block**: Handles specific types of errors when they occur
- **Finally block**: Optional block that always executes regardless of errors

Purpose:
1. **Prevent crashes**: Handle errors gracefully instead of terminating
2. **User experience**: Provide meaningful error messages to users
3. **Debugging**: Log errors for developers to identify and fix issues
4. **Recovery**: Attempt alternative solutions when errors occur

Best practices include catching specific exception types, providing informative error messages, logging errors appropriately, and implementing fallback mechanisms when possible.

QUESTION 3: Write a function that reads a file and handles potential errors.

ANSWER: Here's a robust file reading function with comprehensive error handling:

def read_file_safely(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            content = file.read()
            return content
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found.")
        return None
    except PermissionError:
        print(f"Error: Permission denied to read '{filename}'.")
        return None
    except UnicodeDecodeError:
        print(f"Error: Cannot decode file '{filename}' as UTF-8.")
        return None
    except Exception as e:
        print(f"Unexpected error reading '{filename}': {e}")
        return None

This function demonstrates proper exception handling by catching specific error types and providing meaningful feedback for each scenario.

QUESTION 4: What are data structures and why are they important?

ANSWER: Data structures are organized ways of storing and managing data in computer memory to enable efficient access, modification, and operations. They are fundamental building blocks for algorithm design and software development.

Key categories:
1. **Linear structures**: Arrays, linked lists, stacks, queues
2. **Non-linear structures**: Trees, graphs, hash tables
3. **Abstract data types**: Sets, maps, priority queues

Importance:
- **Efficiency**: Choose appropriate structures for optimal time/space complexity
- **Organization**: Logical data arrangement improves code clarity
- **Performance**: Proper structure selection dramatically affects speed
- **Problem-solving**: Different structures enable different algorithmic approaches

Selection criteria include access patterns (sequential vs random), modification frequency (insertions/deletions), memory constraints, and required operations (searching, sorting, traversal).

QUESTION 5: Describe the software development lifecycle and its phases.

ANSWER: The Software Development Lifecycle (SDLC) is a systematic process for developing software applications that ensures quality, efficiency, and successful project completion.

Main phases:
1. **Planning**: Define project scope, requirements, timeline, and resources
2. **Analysis**: Gather detailed requirements and create system specifications
3. **Design**: Create system architecture, database design, and user interfaces
4. **Implementation**: Write actual code based on design specifications
5. **Testing**: Verify functionality, find bugs, and ensure quality standards
6. **Deployment**: Release software to production environment
7. **Maintenance**: Ongoing support, updates, and bug fixes

Common methodologies:
- **Waterfall**: Sequential phases with formal handoffs
- **Agile**: Iterative development with frequent deliveries
- **DevOps**: Continuous integration and deployment practices

Benefits include reduced risks, improved quality, better resource management, and predictable delivery timelines.

QUESTION 6: Explain algorithms and their complexity analysis.

ANSWER: Algorithms are step-by-step procedures for solving computational problems efficiently and systematically. Algorithm analysis evaluates performance characteristics to guide selection and optimization.

Complexity analysis measures:
1. **Time complexity**: How execution time scales with input size
2. **Space complexity**: How memory usage scales with input size

Big O notation describes worst-case growth rates:
- O(1): Constant time (hash table lookup)
- O(log n): Logarithmic time (binary search)
- O(n): Linear time (array traversal)
- O(n log n): Log-linear time (efficient sorting)
- O(n²): Quadratic time (nested loops)

Algorithm design strategies:
- **Divide and conquer**: Break problems into smaller subproblems
- **Dynamic programming**: Store solutions to avoid recomputation
- **Greedy algorithms**: Make locally optimal choices
- **Backtracking**: Explore solution space systematically

Understanding complexity helps developers choose appropriate algorithms for performance-critical applications and predict system behavior under scale.

Score Expectation: 95-100% - Demonstrates comprehensive understanding of advanced programming concepts with detailed explanations and practical examples.`;
}

/**
 * Imperfect student Quiz: Programming Concepts content
 */
function getImperfectProgrammingConceptsContent() {
  return `Quiz: Programming Concepts - Imperfect Student Submission

Student Name: Struggling Student
Assignment: Quiz: Programming Concepts
Date: January 2025

1. What is object-oriented programming and what are its key principles?

Object-oriented programming is when you use objects in your code instead of just functions. I think there are 3 or 4 main principles but I can only remember a few of them.

Encapsulation means you put things together in a class. Inheritance is when one class gets stuff from another class, like a child class getting things from a parent class. There's also something called polymorphism but I'm not really sure what that means exactly.

I know OOP is supposed to make code better organized and easier to reuse, but I still find it confusing compared to just writing regular functions.

2. Explain error handling in programming. What are try-catch blocks?

Error handling is when you try to prevent your program from crashing when something goes wrong. Try-catch blocks are a way to do this.

You put code that might have errors in the try part, and then if an error happens, it goes to the catch part instead of crashing. I think there's also a finally part that always runs but I'm not sure when you would use that.

I've used try-catch a few times but I usually just put everything in the try block and then print "an error occurred" in the catch block. I probably should be more specific about what errors I'm catching.

3. Write a function that reads a file and handles potential errors.

def read_file(filename):
    try:
        file = open(filename, 'r')
        content = file.read()
        file.close()
        return content
    except:
        print("Error reading file")
        return None

I think this should work. I put the file reading in a try block and if anything goes wrong it will print an error message. I remember you're supposed to close files but I'm not sure if I need to do that in the except block too.

4. What are data structures and why are they important?

Data structures are different ways to store data in your program. Like arrays (or lists in Python), and there are other ones too like stacks and queues and trees.

They're important because some are faster for certain things. Like if you need to search for something, some data structures are better than others. Arrays are good for storing lists of things, and I think hash tables are really fast for looking things up.

I know there are complex ones like binary trees but I don't really understand how those work yet. We learned about big O notation which is supposed to tell you how fast algorithms are but I still get confused about when to use O(n) vs O(log n).

5. Describe the software development lifecycle and its phases.

The software development lifecycle is the process you follow when making software. I think there are several phases:

First you plan what you want to build, then you design how it will work, then you write the code, then you test it to find bugs, and finally you release it to users.

I've heard of agile and waterfall which are different ways to do this. Agile is more flexible and you make changes as you go, while waterfall is more structured and you finish each phase before moving to the next one.

There's also something about maintenance after you release the software but I'm not sure what that involves exactly.

6. Explain algorithms and their complexity analysis.

Algorithms are instructions for solving problems with code. Like if you want to sort a list, there are different algorithms you can use like bubble sort or quick sort.

Complexity analysis is about figuring out how fast an algorithm will be. There's something called Big O notation that measures this. O(1) means it's always the same speed, O(n) means it gets slower as the data gets bigger.

I know bubble sort is slow (O(n²) I think?) and there are faster sorting algorithms but I can't remember their names. Binary search is supposed to be really fast because it's O(log n) but I don't totally understand why logarithms make it faster.

I still have trouble figuring out the Big O notation for algorithms I write myself.

Major Issues with this submission:
1. Vague and incomplete explanations
2. Frequent use of "I think" and "I'm not sure" showing uncertainty
3. Missing important details and concepts
4. Some incorrect or oversimplified information
5. Informal language inappropriate for academic context

Score Expectation: 55-70% - Shows basic awareness of concepts but lacks depth and contains several gaps in understanding.`;
}