pipeline {
    agent any

    environment {
        AWS_REGION = "ap-south-1"
        ACCOUNT_ID = "062000001375"

        BACKEND_REPO = "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/duemind-backend"
        FRONTEND_REPO = "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/duemind-frontend"

        IMAGE_TAG = "v${BUILD_NUMBER}"
    }

    stages {

        stage('Clone Code') {
            steps {
                git 'https://github.com/gufran-17/Duemind.git'
            }
        }

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

        stage('Push to ECR') {
            steps {
                sh '''
                docker tag backend:${IMAGE_TAG} $BACKEND_REPO:${IMAGE_TAG}
                docker tag frontend:${IMAGE_TAG} $FRONTEND_REPO:${IMAGE_TAG}

                docker push $BACKEND_REPO:${IMAGE_TAG}
                docker push $FRONTEND_REPO:${IMAGE_TAG}
                '''
            }
        }

        stage('Terraform Deploy') {
            steps {
                sh '''
                cd terraform/ECS
                terraform init
                terraform apply -auto-approve \
                -var="backend_image=$BACKEND_REPO:${IMAGE_TAG}" \
                -var="frontend_image=$FRONTEND_REPO:${IMAGE_TAG}"
                '''
            }
        }
    }
}