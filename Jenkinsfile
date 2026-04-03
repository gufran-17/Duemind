pipeline {
    agent any

    environment {
        AWS_REGION = "ap-south-1"
        ACCOUNT_ID = "062000001375"

        ECR_REPO = "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/duemind"

        IMAGE_TAG = "v${BUILD_NUMBER}"
    }

    stages {

        stage('Build Docker Images') {
            steps {
                sh '''
                docker build -t backend:${IMAGE_TAG} ./backend
                docker build -t frontend:${IMAGE_TAG} ./frontend
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                sh '''
                aws ecr get-login-password --region $AWS_REGION \
                | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                '''
            }
        }

        stage('Tag & Push Images') {
            steps {
                sh '''
                docker tag backend:${IMAGE_TAG} $ECR_REPO:backend-${IMAGE_TAG}
                docker tag frontend:${IMAGE_TAG} $ECR_REPO:frontend-${IMAGE_TAG}

                docker push $ECR_REPO:backend-${IMAGE_TAG}
                docker push $ECR_REPO:frontend-${IMAGE_TAG}
                '''
            }
        }

        stage('Terraform Deploy') {
            steps {
                sh '''
                cd terraform/ECS
                terraform init --upgrade
                terraform apply -auto-approve \
                -var="backend_image=$ECR_REPO:backend-${IMAGE_TAG}" \
                -var="frontend_image=$ECR_REPO:frontend-${IMAGE_TAG}"
                '''
            }
        }
    }
}