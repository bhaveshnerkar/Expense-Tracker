  

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
        title = input("Enter the Expense: ")# note the expense
        value = int(input("Enter the Amount: "))# note the amount of expence (thats why in is use to convert it into number)
        print("Expense:", title)
        print("Amount:", value)
        transation={title:value}# store the each transation in each diff dictionary
        Expense.append(transation)

    elif choice == "2":
        print("Expense Sheet :")
        print(Expense) # now here we print expense dictionay

    elif choice == "3":
        total=0

        for item in Expense:
            total=total+ list(item.values())[0]
        

        print("Total Expense:", total)# now sum of the expenses dictionay valus 

    elif choice == "4":
        print("Goodbye, bro!")
        break

    else:
        print("Invalid choice. Please enter 1, 2, 3, or 4.") # for invalid options

    print() #Use for blank line 






