import re
import os

files = [
    "src/components/payment/RecordPaymentModal.tsx",
    "src/pages/expenses/ExpensesPage.tsx",
    "src/pages/finance/FinanceFormPage.tsx",
    "src/pages/payment/InvoiceListPage.tsx",
    "src/pages/payment/PaymentListPage.tsx",
    "src/pages/projects/ProjectDetailPage.tsx",
    "src/pages/projects/ProjectsPage.tsx",
    "src/pages/allocation/AllocationPage.tsx",
    "src/pages/payment/MilestoneListPage.tsx",
    "src/pages/tickets/TicketsPage.tsx"
]

def patch_file(filepath):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, does not exist")
        return
        
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    imports_added = set()

    # Function to replace <Select ...> inside <Form.Item name="FIELD_NAME" ...>
    def inject_dropdown(name, render_func):
        nonlocal content
        # Pattern to match <Form.Item name="name" ...> up to the first <Select
        # We'll use a regex that finds <Form.Item name="name" then any chars until <Select
        # and we capture the <Select to append to it.
        pattern = rf'(<Form\.Item\s+name="{name}"[^>]*>[\s\S]*?)<Select\b([^>]*)>'
        
        def replacer(match):
            form_item_start = match.group(1)
            select_attrs = match.group(2)
            
            # If already has dropdownRender, skip
            if "dropdownRender" in select_attrs:
                return match.group(0)
                
            imports_added.add(render_func)
            # Append the dropdownRender
            return f'{form_item_start}<Select dropdownRender={{{render_func}}}{select_attrs}>'
            
        content = re.sub(pattern, replacer, content)

    inject_dropdown("client", "renderClientDropdown")
    inject_dropdown("project", "renderProjectDropdown")
    
    # special check for FinanceFormPage.tsx where name="client" might be slightly different or not in Form.Item directly
    # Wait, in FinanceFormPage.tsx: name="client" is in Form.Item
    
    if content != original_content:
        # Add imports
        import_stmt = 'import { ' + ', '.join(imports_added) + ' } from "@/components/common/DropdownRenderers";\n'
        # Find last import
        imports = list(re.finditer(r'^import .*?;?\n', content, re.MULTILINE))
        if imports:
            last_import = imports[-1]
            idx = last_import.end()
            content = content[:idx] + import_stmt + content[idx:]
        else:
            content = import_stmt + content
            
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched {filepath}")
    else:
        print(f"No changes in {filepath}")

for f in files:
    patch_file(f)

