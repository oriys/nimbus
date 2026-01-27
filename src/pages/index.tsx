import React from "react";

import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";

type Feature = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const FeatureList: Feature[] = [
  {
    title: "安全隔离",
    description: "基于 Firecracker MicroVM 的隔离模型，为函数执行提供更强的安全边界。",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4zm0 3.2L6 7.8V12c0 3.5 2.2 6.8 6 7.7 3.8-.9 6-4.2 6-7.7V7.8l-6-2.6z"
        />
      </svg>
    ),
  },
  {
    title: "低冷启动",
    description: "轻量化运行时与按需调度，面向高并发与突发流量保持稳定的启动性能。",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13 2s-1 2.5 1 5c2.5 3 .5 5.5-1 6.8C11.5 15 10.8 16.4 11 18c.2 1.6 1.3 3 3 4-5.6-.3-9-4-9-8.7C5 8.6 9.5 5.1 13 2zm5 8c2.2 2.2 3 4.4 3 6.5 0 2.6-1.5 5-4 5.5 1-1.2 1.2-2.5.7-3.7-.7-1.7-2.4-2.3-2.9-3.8-.5-1.3.2-2.6 1.3-4.5.5 1 1.1 1.7 1.9 2z"
        />
      </svg>
    ),
  },
  {
    title: "多语言运行时",
    description: "Python / Node.js / Go / Wasm（可用于 Rust）开箱即用，统一 API 调用体验。",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 5h16v4H4V5zm0 6h10v4H4v-4zm0 6h16v2H4v-2zm12-6h4v4h-4v-4z"
        />
      </svg>
    ),
  },
  {
    title: "异步与重试",
    description: "支持异步调用与队列化执行，结合存储与重试策略提升稳定性与吞吐能力。",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 5V2l4 4-4 4V7a5 5 0 00-5 5H5a7 7 0 017-7zm7 7a7 7 0 01-7 7v3l-4-4 4-4v3a5 5 0 005-5h2z"
        />
      </svg>
    ),
  },
  {
    title: "可观测性",
    description: "内置健康检查与 Prometheus 指标，配合 Grafana 快速搭建可观测体系。",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 3h2v18H3V3zm4 10h2v8H7v-8zm4-6h2v14h-2V7zm4 9h2v5h-2v-5zm4-13h2v18h-2V3z"
        />
      </svg>
    ),
  },
  {
    title: "开发者体验",
    description: "HTTP API + CLI，快速创建、更新、调用函数；本机 Docker 模式无需 KVM 也能跑通。",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm0 2v10h16V7H4zm2 2l4 3-4 3V9zm6 6h6v2h-6v-2z"
        />
      </svg>
    ),
  },
];

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Function"
      description="Firecracker/Docker Serverless Platform - 产品与 API 文档"
    >
      <main>
        <header className="fnHero">
          <div className="container">
            <div className="fnHero__inner">
              <div className="fnHero__left">
                <p className="fnHero__kicker">Production Serverless</p>
                <h1 className="fnHero__title">Function</h1>
                <p className="fnHero__subtitle">
                  基于 Firecracker MicroVM 的生产级 Serverless 函数计算平台，同时提供 Docker
                  模式用于本机快速开发与验证（零 KVM 依赖）。
                </p>

                <div className="fnHero__buttons">
                  <Link className="button button--primary button--lg" to="/docs">
                    立即开始
                  </Link>
                  <Link
                    className="button button--secondary button--outline button--lg"
                    to="/docs/api"
                  >
                    查看 API
                  </Link>
                </div>

                <div className="fnBadgeRow">
                  <span className="fnBadge">Firecracker</span>
                  <span className="fnBadge">Docker Runtime</span>
                  <span className="fnBadge">Prometheus</span>
                  <span className="fnBadge">Grafana</span>
                </div>

                <p className="fnHero__meta">
                  默认 API：<code>http://localhost:8080</code> · 前缀：<code>/api/v1</code>
                </p>
              </div>

              <div className="fnHero__right" aria-hidden="true">
                <img
                  className="fnHero__art"
                  src={useBaseUrl("/img/hero-illustration.svg")}
                  alt=""
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </header>

        <section className="fnSection">
          <div className="container">
            <div className="fnSection__head">
              <h2 className="fnSection__title">为生产而生</h2>
              <p className="fnSection__subtitle">
                面向安全隔离、快速启动、可观测与可扩展调度的 Serverless 执行层。
              </p>
            </div>

            <div className="fnFeatureGrid">
              {FeatureList.map((item) => (
                <div key={item.title} className="fnFeature">
                  <div className="fnFeature__icon" aria-hidden="true">
                    {item.icon}
                  </div>
                  <div className="fnFeature__body">
                    <h3 className="fnFeature__title">{item.title}</h3>
                    <p className="fnFeature__desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="fnSection fnSection--alt">
          <div className="container">
            <div className="fnSection__head">
              <h2 className="fnSection__title">架构概览</h2>
              <p className="fnSection__subtitle">
                Gateway 负责 API 与鉴权，Scheduler 负责调度执行，底层可选 Firecracker 或 Docker
                运行时。
              </p>
            </div>

            <div className="fnArch">
              <img
                className="fnArch__img"
                src={useBaseUrl("/img/architecture.svg")}
                alt="Function architecture diagram"
                loading="lazy"
              />
              <div className="fnArch__side">
                <div className="fnCard fnCard--flat">
                  <h3>两种执行模式</h3>
                  <ul>
                    <li>
                      <b>Firecracker</b>：Linux + KVM，MicroVM 强隔离
                    </li>
                    <li>
                      <b>Docker</b>：无 KVM 环境快速跑通（开发/CI/演示）
                    </li>
                  </ul>
                </div>
                <div className="fnCard fnCard--flat">
                  <h3>依赖组件</h3>
                  <ul>
                    <li>PostgreSQL：函数元数据与调用记录</li>
                    <li>Redis：队列/状态/缓存（实现相关）</li>
                    <li>NATS：事件总线（实现相关）</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fnSection">
          <div className="container">
            <div className="fnSection__head">
              <h2 className="fnSection__title">快速开始</h2>
              <p className="fnSection__subtitle">
                使用 OrbStack Kubernetes 一键部署完整的开发环境。
              </p>
            </div>

            <div className="fnSteps">
              <div className="fnStep">
                <div className="fnStep__num">1</div>
                <div className="fnStep__body">
                  <h3>进入部署目录</h3>
                  <pre>
                    <code>
                      cd deployments/k8s/overlays/orbstack
                    </code>
                  </pre>
                </div>
              </div>

              <div className="fnStep">
                <div className="fnStep__num">2</div>
                <div className="fnStep__body">
                  <h3>一键启动</h3>
                  <pre>
                    <code>{`./start.sh

# 或跳过镜像构建（如果已存在）
./start.sh --skip-images`}</code>
                  </pre>
                  <p className="fnStep__hint">
                    自动构建镜像、部署服务、加载示例函数。
                  </p>
                </div>
              </div>

              <div className="fnStep">
                <div className="fnStep__num">3</div>
                <div className="fnStep__body">
                  <h3>测试调用</h3>
                  <pre>
                    <code>{`curl -X POST http://192.168.139.2:8080/api/v1/functions/echo-python/invoke \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello Nimbus!"}'`}</code>
                  </pre>
                  <p className="fnStep__hint">
                    Web UI: <code>http://localhost:32002</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="fnCTA">
              <div className="fnCTA__inner">
                <div>
                  <h2 className="fnCTA__title">准备好开始了吗？</h2>
                  <p className="fnCTA__subtitle">使用 OrbStack 快速部署，体验完整的 Serverless 平台功能。</p>
                </div>
                <div className="fnCTA__buttons">
                  <Link className="button button--primary button--lg" to="/docs">
                    打开快速开始
                  </Link>
                  <Link className="button button--secondary button--outline button--lg" to="/docs/api">
                    浏览 API
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
