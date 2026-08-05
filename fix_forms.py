import re

def fix_project_form():
    with open("src/pages/projects/ProjectFormPage.tsx", "r") as f:
        content = f.read()

    # Imports
    content = content.replace(
        'import { post, get } from "@/services/api";',
        'import { post, get } from "@/services/api";\nimport { businessTypeApi, billingTypeApi, type BusinessTypeDropdown, type DropdownOption } from "@/services/master";\nimport { projectsApi } from "@/services/projects";'
    )

    # Queries
    old_queries = '''  const { data: businessTypesData } = useQuery({
    queryKey: ["master-business-types"],
    queryFn: () => get<any>(`/master/business-type/?limit=100`),
  });
  const businessTypes = businessTypesData?.results || [];

  const { data: billingTypesData } = useQuery({
    queryKey: ["master-billing-types"],
    queryFn: () => get<any>(`/master/billing-type/?limit=100`),
  });
  const billingTypes = billingTypesData?.results || [];'''

    new_queries = '''  const { data: businessTypes = [] } = useQuery<BusinessTypeDropdown[]>({
    queryKey: ["dd", "business-types"],
    queryFn: () => businessTypeApi.dropdown(),
    staleTime: 60_000,
  });
  const { data: billingTypes = [] } = useQuery<DropdownOption[]>({
    queryKey: ["dd", "billing-types"],
    queryFn: () => billingTypeApi.dropdown(),
    staleTime: 60_000,
  });'''
    content = content.replace(old_queries, new_queries)

    # Generate Code
    old_generate = '''  const [generatingCode, setGeneratingCode] = useState(false);
  const generateCode = async (btId?: string) => {
    // mock or fetch real code here
  };'''

    new_generate = '''  const [generatingCode, setGeneratingCode] = useState(false);
  const generateCode = async (btId?: string) => {
    try {
      setGeneratingCode(true);
      const { code } = await projectsApi.generateCode(btId);
      form.setFieldValue("code", code);
    } catch (e: any) {
      message.error("Failed to generate code");
    } finally {
      setGeneratingCode(false);
    }
  };'''
    content = content.replace(old_generate, new_generate)

    with open("src/pages/projects/ProjectFormPage.tsx", "w") as f:
        f.write(content)

def fix_client_form():
    with open("src/pages/clients/ClientFormPage.tsx", "r") as f:
        content = f.read()

    old_queries = '''  const { data: categoriesData } = useQuery({
    queryKey: ["master-client-categories"],
    queryFn: () => get<any>(`/master/client-category/?limit=100`),
  });
  const categories = categoriesData?.results ?? [];'''

    new_queries = '''  const { data: categories } = useQuery({
    queryKey: ["client-categories"],
    queryFn:  () => get<Array<{ id: string; name: string }>>("/master/dropdown/client-categories/"),
  });'''
    content = content.replace(old_queries, new_queries)

    # In case there's an error on categories usage
    content = content.replace('(categories ?? []).map((c: any) =>', '(categories ?? []).map((c: any) =>')

    with open("src/pages/clients/ClientFormPage.tsx", "w") as f:
        f.write(content)


fix_project_form()
fix_client_form()
