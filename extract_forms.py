import re

def create_client_form_page():
    with open('src/pages/clients/ClientPage.tsx', 'r') as f:
        client_page = f.read()

    # Extract GeoPickerField, UpperInput, FlyToLocation, InvalidateOnShow, MapClickHandler, parseCoord, toLatLng, isValidPosition
    # They are from line 45 to 273 roughly.
    helpers_pattern = r'interface GeoResult[\s\S]*?(?=\/\/ ── Main page)'
    helpers_match = re.search(helpers_pattern, client_page)
    helpers_code = helpers_match.group(0) if helpers_match else ""

    # Extract Form JSX
    form_pattern = r'<Form[\s\S]*?</Form>'
    form_match = re.search(form_pattern, client_page)
    form_jsx = form_match.group(0) if form_match else ""

    # Replace onFinish
    form_jsx = form_jsx.replace('onFinish={(v) => saveMutation.mutate(v)}', 'onFinish={onFinish}')

    # Create ClientFormPage.tsx
    content = f"""import React, {{ useState, useRef, useEffect, useCallback }} from "react";
import {{ Form, Input, Button, Select, Collapse, message, Divider, Space, Card, Typography }} from "antd";
import {{ DownOutlined, SafetyCertificateOutlined, EnvironmentOutlined, ArrowLeftOutlined, SaveOutlined, CheckCircleOutlined }} from "@ant-design/icons";
import {{ useMutation, useQuery }} from "@tanstack/react-query";
import {{ MapContainer, TileLayer, Marker, useMapEvents, useMap }} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {{ post, get }} from "@/services/api";
import PhoneInput from "@/components/common/PhoneInput";
import {{ phoneFormRules }} from "@/utils/phone";

// Fix default leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({{
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
}});

const {{ Title, Text }} = Typography;
const {{ Panel }} = Collapse;

{helpers_code}

export default function ClientFormPage() {{
  const [form] = Form.useForm();
  const [collapseKeys, setCollapseKeys] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const {{ data: categoriesData }} = useQuery({{
    queryKey: ["master-client-categories"],
    queryFn: () => get<any>(`/master/client-category/?limit=100`),
  }});
  const categories = categoriesData?.results ?? [];

  const saveMutation = useMutation({{
    mutationFn: (d: any) => post("/clients/", d),
    onSuccess: () => {{
      message.success("Client created successfully");
      setIsSuccess(true);
    }},
    onError: () => message.error("Failed to create client"),
  }});

  const onFinish = (values: any) => {{
    saveMutation.mutate(values);
  }};

  if (isSuccess) {{
    return (
      <div style={{{{ maxWidth: 600, margin: "60px auto", padding: 24, textAlign: "center" }}}}>
        <Card style={{{{ borderRadius: 12, border: "1px solid var(--bms-border)", boxShadow: "var(--shadow-sm)" }}}}>
          <CheckCircleOutlined style={{{{ fontSize: 64, color: "#52c41a", marginBottom: 24 }}}} />
          <Title level={{3}}>Client Created Successfully</Title>
          <Text style={{{{ color: "var(--bms-text-2)" }}}}>
            You can now safely close this tab and return to your original page.
          </Text>
          <div style={{{{ marginTop: 32 }}}}>
            <Button size="large" onClick={{() => window.close()}}>Close Tab</Button>
            <Button size="large" type="primary" style={{{{ marginLeft: 16 }}}} onClick={{() => {{ setIsSuccess(false); form.resetFields(); }}}}>
              Create Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }}

  return (
    <div style={{{{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}}}>
      <div style={{{{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}}}>
        <Space align="center" size={{16}}>
          <Button type="text" icon={{<ArrowLeftOutlined />}} onClick={{() => window.history.back()}} />
          <Title level={{4}} style={{{{ margin: 0 }}}}>Create New Client</Title>
        </Space>
        <Button
          type="primary"
          icon={{<SaveOutlined />}}
          loading={{saveMutation.isPending}}
          onClick={{() => form.submit()}}
        >
          Save Client
        </Button>
      </div>

      <Card style={{{{ borderRadius: 12, border: "1px solid var(--bms-border)", boxShadow: "var(--shadow-sm)" }}}}>
        {form_jsx}
      </Card>
    </div>
  );
}}
"""
    with open('src/pages/clients/ClientFormPage.tsx', 'w') as f:
        f.write(content)

def create_project_form_page():
    with open('src/pages/projects/ProjectsPage.tsx', 'r') as f:
        project_page = f.read()
        
    form_pattern = r'<Form[\s\S]*?</Form>'
    form_match = re.search(form_pattern, project_page)
    form_jsx = form_match.group(0) if form_match else ""

    # In project form: editProject -> false, businessTypes, billingTypes, clients
    form_jsx = form_jsx.replace('onFinish={onFinish}', 'onFinish={onFinish}')
    form_jsx = form_jsx.replace('disabled={!!editProject}', '')
    form_jsx = form_jsx.replace('disabled={editProject !== null}', '')
    # Remove {editProject && <Tag>} blocks
    form_jsx = re.sub(r'\{editProject && \([\s\S]*?</Tag>\s*\)\}', '', form_jsx)

    content = f"""import React, {{ useState }} from "react";
import {{ Form, Input, Button, Select, Switch, Row, Col, DatePicker, InputNumber, Card, Typography, Space, message, Tag }} from "antd";
import {{ ArrowLeftOutlined, SaveOutlined, CheckCircleOutlined }} from "@ant-design/icons";
import {{ useMutation, useQuery }} from "@tanstack/react-query";
import {{ post, get }} from "@/services/api";
import RichTextEditor from "@/components/common/RichTextEditor";
import {{ toOptions }} from "@/utils/options";
import {{ renderClientDropdown }} from "@/components/common/DropdownRenderers";

const {{ Title, Text }} = Typography;

export default function ProjectFormPage() {{
  const [form] = Form.useForm();
  const [isSuccess, setIsSuccess] = useState(false);
  const [clientSelectOpen, setClientSelectOpen] = useState(false);

  const {{ data: clientsData }} = useQuery({{
    queryKey: ["clients"],
    queryFn: () => get<any>(`/clients/?limit=1000`),
  }});
  const clients = clientsData?.results || clientsData || [];

  const {{ data: businessTypesData }} = useQuery({{
    queryKey: ["master-business-types"],
    queryFn: () => get<any>(`/master/business-type/?limit=100`),
  }});
  const businessTypes = businessTypesData?.results || [];

  const {{ data: billingTypesData }} = useQuery({{
    queryKey: ["master-billing-types"],
    queryFn: () => get<any>(`/master/billing-type/?limit=100`),
  }});
  const billingTypes = billingTypesData?.results || [];

  const saveMutation = useMutation({{
    mutationFn: (d: any) => post("/projects/", d),
    onSuccess: () => {{
      message.success("Project created successfully");
      setIsSuccess(true);
    }},
    onError: () => message.error("Failed to create project"),
  }});

  const onFinish = (values: any) => {{
    const payload = {{
      ...values,
      start_date: values.start_date ? values.start_date.format("YYYY-MM-DD") : null,
      end_date: values.end_date ? values.end_date.format("YYYY-MM-DD") : null,
    }};
    saveMutation.mutate(payload);
  }};

  const filterOpt = (input: string, option: any) =>
    (option?.label ?? "").toLowerCase().includes(input.toLowerCase());
    
  const onBusinessTypeChange = (val: string) => {{
    const bt = businessTypes.find((b: any) => b.id === val);
    if (bt?.name === "Internal") form.setFieldsValue({{ client: null }});
  }};
  
  const editProject = false; // to satisfy leftover jsx

  if (isSuccess) {{
    return (
      <div style={{{{ maxWidth: 600, margin: "60px auto", padding: 24, textAlign: "center" }}}}>
        <Card style={{{{ borderRadius: 12, border: "1px solid var(--bms-border)", boxShadow: "var(--shadow-sm)" }}}}>
          <CheckCircleOutlined style={{{{ fontSize: 64, color: "#52c41a", marginBottom: 24 }}}} />
          <Title level={{3}}>Project Created Successfully</Title>
          <Text style={{{{ color: "var(--bms-text-2)" }}}}>
            You can now safely close this tab and return to your original page.
          </Text>
          <div style={{{{ marginTop: 32 }}}}>
            <Button size="large" onClick={{() => window.close()}}>Close Tab</Button>
            <Button size="large" type="primary" style={{{{ marginLeft: 16 }}}} onClick={{() => {{ setIsSuccess(false); form.resetFields(); }}}}>
              Create Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }}

  return (
    <div style={{{{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}}}>
      <div style={{{{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}}}>
        <Space align="center" size={{16}}>
          <Button type="text" icon={{<ArrowLeftOutlined />}} onClick={{() => window.history.back()}} />
          <Title level={{4}} style={{{{ margin: 0 }}}}>Create New Project</Title>
        </Space>
        <Button
          type="primary"
          icon={{<SaveOutlined />}}
          loading={{saveMutation.isPending}}
          onClick={{() => form.submit()}}
        >
          Save Project
        </Button>
      </div>

      <Card style={{{{ borderRadius: 12, border: "1px solid var(--bms-border)", boxShadow: "var(--shadow-sm)" }}}}>
        {form_jsx}
      </Card>
    </div>
  );
}}
"""
    with open('src/pages/projects/ProjectFormPage.tsx', 'w') as f:
        f.write(content)

create_client_form_page()
create_project_form_page()
