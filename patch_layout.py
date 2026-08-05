import re

def patch_layout():
    with open('src/components/layout/AppLayout.tsx', 'r') as f:
        content = f.read()

    # Imports
    content = content.replace(
        'import { useNavigate, useLocation, Outlet } from "react-router-dom";',
        'import { useNavigate, useLocation, Outlet, useSearchParams } from "react-router-dom";\nimport ClientFormPage from "@/pages/clients/ClientFormPage";\nimport ProjectFormPage from "@/pages/projects/ProjectFormPage";'
    )

    # Component state
    content = content.replace(
        'export default function AppLayout() {\n',
        'export default function AppLayout() {\n  const [searchParams] = useSearchParams();\n  const showAddClient = searchParams.get("add_client") === "true";\n  const showAddProject = searchParams.get("add_project") === "true";\n'
    )

    # Content Area
    content = content.replace(
        '<Outlet />',
        '<div style={{ display: (showAddClient || showAddProject) ? "none" : "block" }}>\n            <Outlet />\n          </div>\n          {showAddClient && <ClientFormPage />}\n          {showAddProject && <ProjectFormPage />}'
    )

    with open('src/components/layout/AppLayout.tsx', 'w') as f:
        f.write(content)

def patch_dropdowns():
    content = """import React from 'react';
import { Divider, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';

const ClientDropdownFooter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <Button
      type="text"
      block
      icon={<PlusOutlined />}
      onClick={(e) => {
        e.preventDefault();
        searchParams.set("add_client", "true");
        setSearchParams(searchParams);
      }}
      style={{ textAlign: 'left', fontWeight: 500 }}
    >
      Add Client
    </Button>
  );
};

export const renderClientDropdown = (menu: React.ReactElement) => (
  <>
    {menu}
    <Divider style={{ margin: '4px 0' }} />
    <ClientDropdownFooter />
  </>
);

const ProjectDropdownFooter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <Button
      type="text"
      block
      icon={<PlusOutlined />}
      onClick={(e) => {
        e.preventDefault();
        searchParams.set("add_project", "true");
        setSearchParams(searchParams);
      }}
      style={{ textAlign: 'left', fontWeight: 500 }}
    >
      Add Project
    </Button>
  );
};

export const renderProjectDropdown = (menu: React.ReactElement) => (
  <>
    {menu}
    <Divider style={{ margin: '4px 0' }} />
    <ProjectDropdownFooter />
  </>
);
"""
    with open('src/components/common/DropdownRenderers.tsx', 'w') as f:
        f.write(content)

patch_layout()
patch_dropdowns()
