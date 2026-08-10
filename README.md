# DueMind – End-to-End DevOps Deployment

## 📌 Project Overview

DueMind is a full-stack application deployed on AWS using Docker, Jenkins, Terraform, Ansible, and Amazon ECS.

The project demonstrates an end-to-end DevOps workflow including infrastructure provisioning, containerization, CI/CD automation, container image management, load balancing, DNS configuration, HTTPS, and deployment troubleshooting.

---

## 🏗️ Architecture

**Developer → GitHub → Jenkins → Docker Build → AWS ECR → Terraform → Amazon ECS → Application Load Balancer → Route 53 → HTTPS/ACM → Application**

---

## 🛠️ Technologies Used

### ☁️ Cloud & AWS

- AWS EC2
- Amazon ECS (EC2 Launch Type)
- Amazon ECR
- Amazon S3
- Amazon VPC
- Application Load Balancer
- Route 53
- AWS ACM
- Security Groups
- Internet Gateway
- NAT Gateway

### 🐳 Containerization

- Docker
- Dockerfiles
- Amazon ECR

### 🔄 CI/CD & Automation

- Jenkins
- Jenkins Pipelines
- Git
- GitHub
- Ansible

### 🏗️ Infrastructure as Code

- Terraform

### 🖥️ Operating System

- Linux

---

## ☁️ AWS Infrastructure

The AWS infrastructure was provisioned using Terraform.

The environment includes:

- VPC
- Public and Private Subnets
- Route Tables
- Internet Gateway
- NAT Gateway
- EC2 Instances
- Amazon ECS Cluster
- Application Load Balancer
- Security Groups
- Amazon ECR

---

## 🐳 Docker & Amazon ECR

The full-stack application was containerized using Docker.

Docker images were built using Dockerfiles and pushed to Amazon ECR for centralized image management.

**Docker Workflow:**

**Application → Dockerfile → Docker Build → Docker Image → Amazon ECR**

---

## 🔄 CI/CD Pipeline

Jenkins was used to automate the application deployment process.

**Pipeline Workflow:**

**GitHub → Jenkins → Docker Build → ECR Push → Terraform Apply → ECS Deploy**

The pipeline automates the application build, Docker image creation, image publishing to Amazon ECR, infrastructure deployment using Terraform, and application deployment on Amazon ECS.

---

## 🏗️ Terraform Infrastructure Automation

Terraform was used to provision and manage AWS infrastructure as code.

The infrastructure included:

- VPC
- Public and Private Subnets
- Route Tables
- Internet Gateway
- NAT Gateway
- EC2 Instances
- ECS Cluster
- Application Load Balancer
- Security Groups

Terraform helped make the infrastructure setup repeatable and version-controlled.

---

## ⚙️ Ansible Automation

Ansible was used to automate Jenkins server setup and configuration.

This reduced manual configuration and made the Jenkins environment repeatable.

---

## 🌐 Application Access

An Application Load Balancer was configured for application traffic distribution.

A custom domain was connected using Amazon Route 53.

AWS Certificate Manager (ACM) was used to enable HTTPS using SSL/TLS certificates.

**Application Access Flow:**

**User → Custom Domain → Route 53 → Application Load Balancer → Amazon ECS → Application**

---

## 🔧 Troubleshooting

During the project implementation, the following issues were troubleshot and resolved:

- ECS task failures
- Docker build issues
- Terraform deployment errors
- Networking configuration issues

---

## 📚 Key DevOps Concepts Demonstrated

- AWS Cloud Infrastructure
- Infrastructure as Code using Terraform
- Docker Containerization
- Amazon ECR
- Amazon ECS
- Jenkins CI/CD
- Jenkins Pipelines
- Ansible Automation
- AWS VPC Networking
- Application Load Balancing
- DNS Management using Route 53
- HTTPS using AWS ACM
- Linux Administration
- Deployment Troubleshooting

---

## 🎯 Project Outcome

The project demonstrates an end-to-end DevOps deployment workflow on AWS, from source code management and CI/CD automation to container image management, infrastructure provisioning, and application deployment on Amazon ECS.
