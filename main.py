  

Expense = []  

while True: 
    print("==============================")
    print("   PYTHON EXPENSE TRACKER")
    print("==============================")

    print("1. Add Expense")
    print("2. View Expenses")
    print("3. Calculate Total")
    print("4. Exit")

    choice = input("Enter your choice: ")


    if choice == "1": 
        title = input("Enter the Expense: ").strip()
        if not title:
            print("-----------------------------")
            print("Expense name cannot be empty!")
            print("-----------------------------")
            continue
       
        try:
            amount=int(input("Enter the Amount:"))
            if amount<=0:
                print("Amount must be greater than 0!")
                continue
        except ValueError:
            print("------------------------------------------")
            print("Invalid amount, please type valid numbers!")
            print("------------------------------------------")
            continue

        print("Expense:", title)
        print("Amount:",amount)
        transation={"title":title,"amount": amount}
        Expense.append(transation)
        

    elif choice == "2":
        print("--------------------")
        print("  Expense Sheet :")
        print("--------------------")
        if not Expense:
            print("No expenses recorded yet !")
        else:

            for item in Expense:
                title = item["title"]
                value = item["amount"]
                print(title,"=",value,"Rs.")

    elif choice == "3":
        if not Expense:
            print("No expenses recorded yet !")
        else:
            total=0

            for item in Expense:
                total += item["amount"]
        
            print("---------------")
            print("     Total     ")
            print("---------------")
            print(total,"Rs.")
       

    elif choice == "4":
        print("Goodbye, bro!")
        break

    else:
        print("Invalid choice. Please enter 1, 2, 3, or 4.")

    print() 






