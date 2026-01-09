import {
  Button,
  Card,
  Form,
  Input,
  Layout,
  message,
  Popconfirm,
  Space,
} from 'antd';
import { useEffect } from 'react';
import type {
  ConfigClearedMessage,
  ConfigDataMessage,
  ConfigSavedMessage,
  JenkinsConfig,
} from '../../types';
import { MessageType } from '../../types';
import { onMessage, postMessage } from '../../utils/vscode';

const defaultValues: JenkinsConfig = {
  url: '',
  username: '',
  token: '',
  webhook: '',
  defaultEnv: '',
};

const Config = () => {
  const [form] = Form.useForm<JenkinsConfig>();

  useEffect(() => {
    // 请求配置数据
    postMessage({ type: MessageType.GET_CONFIG });

    // 监听配置数据响应
    const unsubscribe = onMessage<
      ConfigDataMessage | ConfigSavedMessage | ConfigClearedMessage
    >((msg) => {
      switch (msg?.type) {
        case MessageType.CONFIG_DATA:
          form.setFieldsValue(msg.config);
          break;
        case MessageType.CONFIG_SAVED:
          if (msg.success) {
            message.success(msg.message || '配置已保存');
          } else {
            message.error(msg.message || '保存失败');
          }
          break;
        case MessageType.CONFIG_CLEARED:
          if (msg.success) {
            message.success(msg.message || '配置已清除');
            form.setFieldsValue(defaultValues);
          } else {
            message.error(msg.message || '清除失败');
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [form]);

  const handleFinish = (values: JenkinsConfig) => {
    // 发送保存配置消息
    postMessage({
      type: MessageType.SAVE_CONFIG,
      config: values,
    });
  };

  const onClear = () => {
    // 发送清除配置消息
    postMessage({ type: MessageType.CLEAR_CONFIG });
  };

  return (
    <Layout.Content>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={defaultValues}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Card
            title="Jenkins 凭证"
            styles={{
              body: { padding: '16px' },
              header: { padding: '12px 16px' },
            }}
            headStyle={{ fontSize: '14px', fontWeight: 600 }}
          >
            <Form.Item
              label="Jenkins 地址"
              name="url"
              rules={[
                { required: true, message: '请输入Jenkins 地址' },
                { type: 'url', message: '请输入正确的Jenkins 地址' },
              ]}
              style={{ marginBottom: '12px' }}
            >
              <Input placeholder="Jenkins 地址" />
            </Form.Item>
            <Form.Item
              label="Jenkins 用户名"
              name="username"
              rules={[{ required: true, message: '请输入Jenkins 用户名' }]}
              style={{ marginBottom: '12px' }}
            >
              <Input placeholder="Jenkins 用户名" />
            </Form.Item>

            <Form.Item
              label="Jenkins Token"
              name="token"
              rules={[{ required: true, message: '请输入Jenkins Token' }]}
              style={{ marginBottom: '12px' }}
            >
              <Input.Password placeholder="Jenkins API Token" />
            </Form.Item>

            <Form.Item
              label="Webhook 地址(可选)"
              name="webhook"
              rules={[{ type: 'url', message: '请输入正确的Webhook 地址' }]}
              tooltip="如果配置了Webhook 地址，将会在构建成功或者失败时触发该Webhook"
              style={{ marginBottom: '12px' }}
            >
              <Input placeholder="Webhook 地址" />
            </Form.Item>

            <Form.Item
              label="默认构建环境(可选)"
              name="defaultEnv"
              tooltip="设置默认构建环境，构建时会自动选中该环境（如果存在）"
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="如: test, prod 等" />
            </Form.Item>
          </Card>

          <Space>
            <Button type="primary" htmlType="submit">
              保存配置
            </Button>
            <Popconfirm
              title="清除配置"
              description="你确定要清除当前配置吗,此操作不可恢复?"
              onConfirm={onClear}
              okText="确定"
              cancelText="取消"
            >
              <Button type="primary" danger>
                清除配置
              </Button>
            </Popconfirm>
          </Space>
        </Space>
      </Form>
    </Layout.Content>
  );
};

export default Config;
