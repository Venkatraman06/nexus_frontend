import re

def clean_duplicate(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the newly added dropdownRender attributes and remove them
    content = content.replace('<Select dropdownRender={renderClientDropdown}', '<Select')
    content = content.replace('<Select dropdownRender={renderProjectDropdown}', '<Select')

    # Replace the OLD multiline dropdownRender blocks with the new variables
    # Client block
    pattern_client = r'dropdownRender=\{\(menu\) => \([\s\S]*?(Add (New )?Client|Create New Client)[\s\S]*?\)\}'
    content = re.sub(pattern_client, 'dropdownRender={renderClientDropdown}', content)

    # Project block (if any existed before)
    pattern_project = r'dropdownRender=\{\(menu\) => \([\s\S]*?(Add (New )?Project|Create New Project)[\s\S]*?\)\}'
    content = re.sub(pattern_project, 'dropdownRender={renderProjectDropdown}', content)

    with open(filepath, 'w') as f:
        f.write(content)

files = [
    "src/components/payment/RecordPaymentModal.tsx",
    "src/pages/payment/InvoiceListPage.tsx",
    "src/pages/payment/PaymentListPage.tsx",
    "src/pages/expenses/ExpensesPage.tsx",
    "src/pages/finance/FinanceFormPage.tsx",
    "src/pages/projects/ProjectDetailPage.tsx",
    "src/pages/allocation/AllocationPage.tsx",
    "src/pages/payment/MilestoneListPage.tsx",
    "src/pages/tickets/TicketsPage.tsx"
]

for f in files:
    clean_duplicate(f)
