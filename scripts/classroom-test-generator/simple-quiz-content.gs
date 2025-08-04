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