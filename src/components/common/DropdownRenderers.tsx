import React from 'react';
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
