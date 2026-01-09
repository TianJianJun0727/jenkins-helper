import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getAuth } from "../services/config";

// 扩展 Axios 配置以支持 returnData 选项
declare module "axios" {
  export interface InternalAxiosRequestConfig {
    returnData?: boolean;
    signal?: AbortSignal;
  }
}

const request = axios.create({
  timeout: 30000,
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    config.auth = getAuth();
    return config;
  },
  (error) => {
    // 处理请求错误
    console.error("请求配置错误:", error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse): any => {
    // 对响应数据做点什么
    if (response.status >= 200 && response.status < 300) {
      return [
        undefined,
        (response.config as InternalAxiosRequestConfig).returnData
          ? response.data
          : response,
      ]; // 直接返回数据部分
    } else {
      console.error("响应状态异常:", response.status, response.data);
      return [
        (response.config as InternalAxiosRequestConfig).returnData
          ? response.data
          : response,
        undefined,
      ];
    }
  },
  (error) => {
    console.error("响应状态异常:", error);
    return [error, undefined];
  }
);

export default request;
