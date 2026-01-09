import { Card, Col, Row } from 'antd';
import { useEffect, useState } from 'react';
import type { InitDataMessage, UpdateDataMessage } from '../../types';
import { MessageType } from '../../types';
import { onMessage } from '../../utils/vscode';
import BuildForm from './form';
import BuildStatus from './status';

const Build = () => {
  const [projectName, setProjectName] = useState<string>('');
  const [currentBranch, setCurrentBranch] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onMessage<InitDataMessage | UpdateDataMessage>(
      (msg) => {
        switch (msg?.type) {
          case MessageType.INIT_DATA:
            if (msg.projectName) {
              setProjectName(msg.projectName);
            }
            break;
          case MessageType.UPDATE_DATA:
            if (msg.currentBranch) {
              setCurrentBranch(msg.currentBranch);
            }
            break;
        }
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <Row gutter={[12, 12]} wrap>
      <Col className="gutter-row" span={24} md={12}>
        <Card
          title="一键构建"
          variant="borderless"
          style={{ height: '100%', width: '100%' }}
          styles={{
            body: { padding: '16px' },
            header: { padding: '12px 16px' },
          }}
          headStyle={{ fontSize: '14px', fontWeight: 600 }}
        >
          <BuildForm projectName={projectName} currentBranch={currentBranch} />
        </Card>
      </Col>
      <Col className="gutter-row" span={24} md={12}>
        <Card
          title="构建状态"
          variant="borderless"
          style={{ height: '100%', width: '100%' }}
          styles={{
            body: { padding: '16px' },
            header: { padding: '12px 16px' },
          }}
          headStyle={{ fontSize: '14px', fontWeight: 600 }}
        >
          <BuildStatus />
        </Card>
      </Col>
    </Row>
  );
};

export default Build;
