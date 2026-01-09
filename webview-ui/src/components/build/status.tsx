import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  LinkOutlined,
  LoadingOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Divider,
  Empty,
  Progress,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import type {
  BuildProgressMessage,
  BuildResultMessage,
  JenkinsBlueOceanNode,
} from '../../types';
import { MessageType } from '../../types';
import { onMessage } from '../../utils/vscode';

const { Text, Link } = Typography;

const BuildStatus = () => {
  const [nodes, setNodes] = useState<JenkinsBlueOceanNode[]>([]);
  const [buildResult, setBuildResult] = useState<BuildResultMessage | null>(
    null,
  );

  useEffect(() => {
    const unsubscribe = onMessage<BuildProgressMessage | BuildResultMessage>(
      (msg) => {
        switch (msg?.type) {
          case MessageType.BUILD_PROGRESS:
            setNodes(msg.nodes);
            break;
          case MessageType.BUILD_RESULT:
            setBuildResult(msg);
            break;
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // 计算构建进度百分比
  const calculateProgress = () => {
    if (nodes.length === 0) return 0;
    const finishedCount = nodes.filter((n) => n.state === 'FINISHED').length;
    return Math.round((finishedCount / nodes.length) * 100);
  };

  // 计算总耗时（毫秒）
  const calculateTotalDuration = () => {
    if (nodes.length === 0) return 0;
    return nodes.reduce((total, node) => {
      return total + (node.durationInMillis || 0);
    }, 0);
  };

  // 格式化耗时显示
  const formatDuration = (ms: number | undefined) => {
    if (!ms || ms === 0) return '--';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${seconds}秒`;
  };

  // 获取状态图标
  const getStateIcon = (node: JenkinsBlueOceanNode) => {
    if (node.state === 'RUNNING') {
      return <LoadingOutlined style={{ color: '#1890ff', fontSize: 16 }} />;
    }
    if (node.state === 'FINISHED') {
      if (node.result === 'SUCCESS') {
        return (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        );
      }
      return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;
    }
    return <ClockCircleOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />;
  };

  // 获取结果标签
  const getResultTag = (result?: string, state?: string) => {
    if (state === 'RUNNING') {
      return (
        <Tag icon={<SyncOutlined spin />} color="processing">
          进行中
        </Tag>
      );
    }

    switch (result) {
      case 'SUCCESS':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            成功
          </Tag>
        );
      case 'FAILURE':
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            失败
          </Tag>
        );
      case 'UNSTABLE':
        return (
          <Tag icon={<CloseCircleOutlined />} color="warning">
            不稳定
          </Tag>
        );
      case 'ABORTED':
        return (
          <Tag icon={<CloseCircleOutlined />} color="default">
            已中止
          </Tag>
        );
      default:
        return (
          <Tag icon={<ClockCircleOutlined />} color="default">
            等待中
          </Tag>
        );
    }
  };

  // 获取总体构建状态
  const getBuildStatusAlert = () => {
    if (!buildResult) return null;

    const { stage, success, message, buildNumber, buildUrl } = buildResult;

    if (stage === 'queued') {
      return (
        <Alert
          message="构建排队中"
          description="正在等待构建执行器分配..."
          type="info"
          showIcon
          icon={<SyncOutlined spin />}
        />
      );
    }

    if (stage === 'building') {
      return (
        <Alert
          message="构建进行中"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>构建正在进行,请稍候...</Text>
              {buildNumber && (
                <Text type="secondary">
                  构建编号: #
                  {buildUrl ? (
                    <Link href={buildUrl} target="_blank">
                      {buildNumber} <LinkOutlined />
                    </Link>
                  ) : (
                    buildNumber
                  )}
                </Text>
              )}
              <Progress percent={calculateProgress()} status="active" />
            </Space>
          }
          type="info"
          showIcon
          icon={<LoadingOutlined />}
        />
      );
    }

    if (stage === 'finished') {
      return (
        <Alert
          message={success ? '构建成功' : '构建失败'}
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>{message}</Text>
              {buildNumber && (
                <Text type="secondary">
                  构建编号: #
                  {buildUrl ? (
                    <Link href={buildUrl} target="_blank">
                      {buildNumber} <LinkOutlined />
                    </Link>
                  ) : (
                    buildNumber
                  )}
                </Text>
              )}
            </Space>
          }
          type={success ? 'success' : 'error'}
          showIcon
        />
      );
    }

    return null;
  };

  // 无构建状态时显示
  if (!buildResult && nodes.length === 0) {
    return (
      <Empty
        description="暂无构建记录"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ padding: '30px 0' }}
        imageStyle={{ height: 60 }}
      />
    );
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      {/* 构建总体状态 */}
      {getBuildStatusAlert()}

      {/* Pipeline 阶段详情 */}
      {nodes.length > 0 && (
        <>
          <Divider plain style={{ margin: '12px 0', textAlign: 'left' }}>
            <Space size="small">
              <span style={{ fontSize: '13px' }}>Pipeline 阶段</span>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                总耗时: {formatDuration(calculateTotalDuration())}
              </Text>
            </Space>
          </Divider>
          <Timeline
            items={nodes.map((node, index) => ({
              key: index,
              dot: getStateIcon(node),
              children: (
                <Space direction="vertical" size={2}>
                  <Space size="small">
                    <Text strong style={{ fontSize: '13px' }}>
                      {node.displayName}
                    </Text>
                    {getResultTag(node.result || undefined, node.state || undefined)}
                    {node.durationInMillis !== undefined &&
                      node.durationInMillis > 0 && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          ({formatDuration(node.durationInMillis)})
                        </Text>
                      )}
                  </Space>
                  {node.state === 'RUNNING' && (
                    <Badge
                      status="processing"
                      text="正在执行..."
                      style={{ fontSize: '12px' }}
                    />
                  )}
                </Space>
              ),
              color:
                node.state === 'RUNNING'
                  ? 'blue'
                  : node.result === 'SUCCESS'
                    ? 'green'
                    : node.result === 'FAILURE'
                      ? 'red'
                      : 'gray',
            }))}
          />
        </>
      )}
    </Space>
  );
};

export default BuildStatus;
