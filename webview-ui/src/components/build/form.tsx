import type { DescriptionsProps } from 'antd';
import {
  Button,
  Descriptions,
  Divider,
  Form,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState, useCallback } from 'react';

const { Link: AntLink } = Typography;
import type {
  BuildProjectOption,
  BuildResultMessage,
  LabeledValue,
  LastBuildResultMessage,
  LoadErrorMessage,
  TriggerBuildPayload,
  UpdateDataMessage,
} from '../../types';
import { MessageType } from '../../types';
import { onMessage, postMessage } from '../../utils/vscode';

export type BuildFormType = {
  project?: string;
  env: string;
  branch: string;
};

interface BuildFormProps {
  projectName?: string;
  currentBranch?: string;
}

const defaultValues: BuildFormType = {
  project: undefined,
  env: '',
  branch: '',
};

const defaultLastBuildInfo = {
  user: '--',
  branch: '--',
  time: '--',
  buildNumber: '--',
  buildUrl: '',
  result: '--',
};

const BuildForm = ({ projectName, currentBranch }: BuildFormProps) => {
  const [form] = Form.useForm<BuildFormType>();
  const [projectOptions, setProjectOptions] = useState<BuildProjectOption[]>(
    [],
  );
  const [envOptions, setEnvOptions] = useState<LabeledValue[]>([]);
  const [branchOptions, setBranchOptions] = useState<LabeledValue[]>([]);
  const [defaultEnv, setDefaultEnv] = useState<string>();
  const [selectedProjectName, setSelectedProjectName] = useState<string>();
  const [isBuilding, setIsBuilding] = useState(false);
  const [lastBuildInfo, setLastBuildInfo] = useState<{
    user: string;
    branch: string;
    time: string;
    buildNumber: string;
    buildUrl: string;
    result: string;
  }>(defaultLastBuildInfo);

  const selectEnv = useCallback(
    (options: LabeledValue[], nextDefaultEnv?: string) => {
      if (options.length === 0) {
        form.setFieldValue('env', '');
        return;
      }

      let selectedEnv = options[0].value;

      if (nextDefaultEnv) {
        const defaultOption = options.find(
          (opt) => opt.label === nextDefaultEnv,
        );
        if (defaultOption) {
          selectedEnv = defaultOption.value;
        }
      }

      form.setFieldValue('env', selectedEnv);
      postMessage({
        type: MessageType.GET_LAST_BUILD_RESULT,
        payload: { jobUrl: selectedEnv },
      });
    },
    [form],
  );

  useEffect(() => {
    // 请求构建数据
    postMessage({ type: MessageType.LOAD_BUILD_DATA });

    // 监听数据更新
    const unsubscribe = onMessage<
      | UpdateDataMessage
      | BuildResultMessage
      | LoadErrorMessage
      | LastBuildResultMessage
    >((msg) => {
      switch (msg?.type) {
        case MessageType.UPDATE_DATA:
          setDefaultEnv(msg.defaultEnv);
          setProjectOptions(msg.projectOptions ?? []);

          const currentProjectName = projectName?.toLowerCase() ?? '';
          const matchedProject = (msg.projectOptions ?? []).find(
            (item) =>
              item.value.toLowerCase() === currentProjectName ||
              item.label.toLowerCase() === currentProjectName,
          );

          setLastBuildInfo(defaultLastBuildInfo);

          if (matchedProject) {
            const nextEnvOptions = matchedProject.envOptions ?? [];

            setEnvOptions(nextEnvOptions);
            form.setFieldValue('project', matchedProject.value);
            setSelectedProjectName(matchedProject.label);
            selectEnv(nextEnvOptions, msg.defaultEnv);
          } else {
            setEnvOptions([]);
            form.setFieldValue('project', undefined);
            setSelectedProjectName(undefined);
            form.setFieldValue('env', '');
          }
          // 更新分支选项
          if (msg.branchOptions) {
            setBranchOptions(msg.branchOptions);
          }
          // 设置当前分支
          if (msg.currentBranch) {
            const branchValue = msg.currentBranch.startsWith('origin/')
              ? msg.currentBranch
              : `origin/${msg.currentBranch}`;
            form.setFieldValue('branch', branchValue);
          }
          break;

        case MessageType.BUILD_RESULT:
          // 构建完成，重置构建状态
          if (msg.stage === 'finished') {
            setIsBuilding(false);
          }
          break;

        case MessageType.LOAD_ERROR:
          // 加载数据失败
          setIsBuilding(false);
          break;

        case MessageType.LAST_BUILD_RESULT:
          // 处理上次构建结果
          setLastBuildInfo((prev) => {
            const newInfo = { ...prev };

            if (msg.result.builder) {
              newInfo.user = msg.result.builder;
            }

            if (msg.result.branch) {
              const branchValue = msg.result.branch.startsWith('origin/')
                ? msg.result.branch
                : `origin/${msg.result.branch}`;
              const branchName = branchValue.replace(/^origin\//, '');
              newInfo.branch = branchName;

              // Only set branch value if the form field is empty or unset
              const currentBranchValue = form.getFieldValue('branch');
              if (!currentBranchValue) {
                form.setFieldValue('branch', branchValue);
              }
            }

            if (msg.result.timestamp) {
              const date = new Date(msg.result.timestamp);
              newInfo.time = date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
            }

            if (msg.result.buildNumber !== undefined) {
              newInfo.buildNumber = `#${msg.result.buildNumber}`;
            }

            if (msg.result.buildUrl) {
              newInfo.buildUrl = msg.result.buildUrl;
            }

            if (msg.result.result) {
              newInfo.result = msg.result.result;
            }

            return newInfo;
          });
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [form, projectName, selectEnv]);

  // 一键构建
  const handleFinish = (values: BuildFormType) => {
    setIsBuilding(true);

    const { project, env, branch } = values;
    const currentEnv = envOptions.find((e) => e.value === env);
    const currentBranch = branchOptions.find((b) => b.value === branch);
    const currentProject = projectOptions.find((p) => p.value === project);
    const buildProjectName =
      currentProject?.label ?? selectedProjectName ?? projectName;

    if (currentEnv && currentBranch) {
      const payload: TriggerBuildPayload = {
        projectName: buildProjectName,
        env: currentEnv.label,
        jobUrl: currentEnv.value,
        branch: currentBranch.value,
        branchLabel: currentBranch.label,
      };

      // 发送触发构建消息
      postMessage({
        type: MessageType.TRIGGER,
        payload,
      });
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    postMessage({ type: MessageType.LOAD_BUILD_DATA });
  };

  // 获取构建结果标签颜色
  const getResultColor = (result: string) => {
    switch (result) {
      case 'SUCCESS':
        return 'success';
      case 'FAILURE':
        return 'error';
      case 'UNSTABLE':
        return 'warning';
      case 'ABORTED':
        return 'default';
      default:
        return 'default';
    }
  };

  // 获取构建结果显示文本
  const getResultText = (result: string) => {
    switch (result) {
      case 'SUCCESS':
        return '成功';
      case 'FAILURE':
        return '失败';
      case 'UNSTABLE':
        return '不稳定';
      case 'ABORTED':
        return '已中止';
      default:
        return result;
    }
  };

  // 环境变更时获取上次构建信息
  const handleEnvChange = (value: string) => {
    postMessage({
      type: MessageType.GET_LAST_BUILD_RESULT,
      payload: { jobUrl: value },
    });
  };

  const handleProjectChange = (value: string) => {
    const selectedProject = projectOptions.find((item) => item.value === value);
    const nextEnvOptions = selectedProject?.envOptions ?? [];

    setEnvOptions(nextEnvOptions);
    setLastBuildInfo(defaultLastBuildInfo);
    setSelectedProjectName(selectedProject?.label ?? value);
    selectEnv(nextEnvOptions, defaultEnv);
  };

  const displayProjectName = selectedProjectName ?? projectName;

  const infoItems: DescriptionsProps['items'] = [
    {
      key: 'project',
      label: '当前项目',
      children: displayProjectName ? (
        <Tag color="blue">{displayProjectName}</Tag>
      ) : (
        <span>--</span>
      ),
    },
    {
      key: 'branch',
      label: '当前分支',
      children: currentBranch ? (
        <Tag color="green">{currentBranch}</Tag>
      ) : (
        <span>--</span>
      ),
    },
    {
      key: 'lastBuild',
      label: '上次构建',
      children: (
        <Space size={6} wrap style={{ lineHeight: '22px' }}>
          {/* 用户 */}
          <span style={{ fontSize: '13px' }}>{lastBuildInfo.user}</span>

          {/* 分支 */}
          {lastBuildInfo.branch !== '--' && (
            <>
              <span style={{ color: '#d9d9d9' }}>|</span>
              <Tag color="orange" style={{ margin: 0, fontSize: '12px' }}>
                {lastBuildInfo.branch}
              </Tag>
            </>
          )}

          {/* 构建编号（可点击） */}
          {lastBuildInfo.buildNumber !== '--' && (
            <>
              <span style={{ color: '#d9d9d9' }}>|</span>
              {lastBuildInfo.buildUrl ? (
                <AntLink
                  href={lastBuildInfo.buildUrl}
                  target="_blank"
                  style={{ fontSize: '13px' }}
                >
                  {lastBuildInfo.buildNumber}
                </AntLink>
              ) : (
                <span style={{ fontSize: '13px' }}>
                  {lastBuildInfo.buildNumber}
                </span>
              )}
            </>
          )}

          {/* 构建结果 */}
          {lastBuildInfo.result !== '--' && (
            <>
              <span style={{ color: '#d9d9d9' }}>|</span>
              <Tag
                color={getResultColor(lastBuildInfo.result)}
                style={{ margin: 0, fontSize: '12px' }}
              >
                {getResultText(lastBuildInfo.result)}
              </Tag>
            </>
          )}

          {/* 时间 */}
          {lastBuildInfo.time !== '--' && (
            <>
              <span style={{ color: '#d9d9d9' }}>|</span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {lastBuildInfo.time}
              </span>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      {/* 项目信息 */}
      <Descriptions
        items={infoItems}
        column={1}
        size="small"
        bordered
        labelStyle={{ width: '100px', padding: '8px 12px' }}
        contentStyle={{ padding: '8px 12px' }}
      />

      <Divider style={{ margin: '8px 0' }} />

      {/* 构建表单 */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={defaultValues}
      >
        {projectOptions.length > 0 && (
          <Form.Item
            label="构建项目"
            name="project"
            rules={[{ required: true, message: '请选择构建项目' }]}
            style={{ marginBottom: '12px' }}
          >
            <Select
              placeholder="请选择构建项目"
              showSearch
              options={projectOptions}
              onChange={handleProjectChange}
            />
          </Form.Item>
        )}
        <Form.Item
          label="构建环境"
          name="env"
          rules={[{ required: true, message: '请选择构建环境' }]}
          style={{ marginBottom: '12px' }}
        >
          <Select
            placeholder="请选择构建环境"
            showSearch
            options={envOptions}
            onChange={handleEnvChange}
          />
        </Form.Item>
        <Form.Item
          label="构建分支"
          name="branch"
          rules={[{ required: true, message: '请选择构建分支' }]}
          style={{ marginBottom: '16px' }}
        >
          <Select
            placeholder="请选择构建分支"
            showSearch
            options={branchOptions}
          />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={isBuilding}>
            一键构建
          </Button>
          <Button onClick={handleRefresh}>刷新数据</Button>
        </Space>
      </Form>
    </Space>
  );
};

export default BuildForm;
