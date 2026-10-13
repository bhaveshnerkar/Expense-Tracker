  

Expense = [] # Make empty list

while True: # Use while loop for repeating the Menu (because true always True)
    print("==============================")
    print("   PYTHON EXPENSE TRACKER")
    print("==============================")

    print("1. Add Expense")
    print("2. View Expenses")
    print("3. Calculate Total")
    print("4. Exit")

    choice = input("Enter your choice: ") # use this to store the user choosen operation

# Use the if-elif-else for impliment operation 
    if choice == "1": 
        title = input("Enter the Expense: ").strip()
        if not title:
            print("-----------------------------")
            print("Expense name cannot be empty!")
            print("-----------------------------")
            continue
        # note the expense
    # note the amount of expence (thats why in is use to convert it into number)
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
        transation={title:amount}# store the each transation in each diff dictionary
        Expense.append(transation)
        

    elif choice == "2":
        print("--------------------")
        print("  Expense Sheet :")
        print("--------------------")
        for item in Expense:
            title = list(item.keys())[0]
            value = list(item.values())[0]
            print(title,"=",value)

    elif choice == "3":

        total=0

        for item in Expense:
            total=total+ list(item.values())[0]
        
        print("---------------")
        print("     Total     ")
        print("---------------")
        print(total,"Rs.")# now sum of the expenses dictionay valus 
       

    elif choice == "4":
        print("Goodbye, bro!")
        break

    else:
        print("Invalid choice. Please enter 1, 2, 3, or 4.") # for invalid options

    print() #Use for blank line 






