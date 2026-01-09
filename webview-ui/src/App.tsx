import type { TabsProps } from 'antd';
import { Card, Flex, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import Build from './components/build';
import Config from './components/config';
import type { InitDataMessage, SwitchToConfigMessage } from './types';
import { MessageType } from './types';
import { notifyReady, onMessage } from './utils/vscode';
import './App.css';

const App = () => {
  const [activeKey, setActiveKey] = useState<string>('build');

  useEffect(() => {
    // 通知 extension webview 已准备好
    notifyReady();

    // 监听来自扩展的消息
    const unsubscribe = onMessage<InitDataMessage | SwitchToConfigMessage>(
      (message) => {
        switch (message?.type) {
          case MessageType.INIT_DATA:
            // 处理初始数据
            if (message.activePage) {
              setActiveKey(message.activePage);
            }
            break;
          case MessageType.SWITCH_TO_CONFIG:
            // 切换到配置页面
            setActiveKey('config');
            break;
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const onChange = (key: string) => {
    setActiveKey(key);
  };

  const items: TabsProps['items'] = [
    {
      key: 'build',
      label: '构建',
      children: <Build />,
    },
    {
      key: 'config',
      label: '配置',
      children: <Config />,
    },
  ];

  return (
    <Flex vertical gap="small" className="content">
      <Card style={{ padding: 0 }} styles={{ body: { padding: '12px' } }}>
        <Tabs
          activeKey={activeKey}
          items={items}
          onChange={onChange}
          tabBarStyle={{ marginBottom: '12px' }}
        />
      </Card>
    </Flex>
  );
};

export default App;
