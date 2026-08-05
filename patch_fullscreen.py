import re

def patch_client():
    with open('src/pages/clients/ClientFormPage.tsx', 'r') as f:
        content = f.read()

    # Import
    content = content.replace(
        'import { useMutation, useQuery } from "@tanstack/react-query";',
        'import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";'
    )

    # queryClient initialization
    content = content.replace(
        '  const [form] = Form.useForm();',
        '  const [form] = Form.useForm();\n  const queryClient = useQueryClient();'
    )

    # Invalidation
    content = content.replace(
        'message.success("Client created successfully");\n      setIsSuccess(true);',
        'message.success("Client created successfully");\n      queryClient.invalidateQueries();\n      setIsSuccess(true);'
    )

    # UI fix
    content = content.replace(
        '<div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>',
        '<div style={{ width: "100%", padding: "16px 24px" }}>'
    )

    with open('src/pages/clients/ClientFormPage.tsx', 'w') as f:
        f.write(content)


def patch_project():
    with open('src/pages/projects/ProjectFormPage.tsx', 'r') as f:
        content = f.read()

    # Import
    content = content.replace(
        'import { useMutation, useQuery } from "@tanstack/react-query";',
        'import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";'
    )

    # queryClient initialization
    content = content.replace(
        '  const [form] = Form.useForm();',
        '  const [form] = Form.useForm();\n  const queryClient = useQueryClient();'
    )

    # Invalidation
    content = content.replace(
        'message.success("Project created successfully");\n      setIsSuccess(true);',
        'message.success("Project created successfully");\n      queryClient.invalidateQueries();\n      setIsSuccess(true);'
    )

    # UI fix
    content = content.replace(
        '<div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>',
        '<div style={{ width: "100%", padding: "16px 24px" }}>'
    )

    with open('src/pages/projects/ProjectFormPage.tsx', 'w') as f:
        f.write(content)

patch_client()
patch_project()
