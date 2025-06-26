# 🚀 CodeRun – C++ Web Code Runner

**CodeRun** is a lightweight, web-based C++ code runner built using **Flask** and **HTML/CSS**. It allows users to:

- Write C++ code directly in the browser
- Provide custom input (stdin) just like with `cin`
- Compile and run the code
- Instantly view the output — all on the same page!

---

## 🛠️ Features

- ✍️ Code editor (supports any C++ logic)
- ⌨️ Custom input for programs with `cin`
- ⚙️ Backend compilation via `g++` (GCC)
- 🧾 Displays both output and compile errors
- 🌗 Clean UI built with HTML/CSS

---

## 📸 Screenshot

![CodeRun Demo](https://your-screenshot-url-if-any)

---

## 💡 How It Works

1. User writes C++ code in the browser.
2. Clicks “Run Code”.
3. The server:
   - Saves the code to `code_runner.cpp`
   - Compiles it using `g++`
   - Runs the executable
   - Captures the output or errors
4. Output is displayed on the right panel.

---

## 🧪 Example Code to Try

```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << "Sum = " << (a + b) << endl;
    return 0;
}
