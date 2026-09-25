import boto3, time

ec2 = boto3.client('ec2', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

print("Stopping Instance...")
ec2.stop_instances(InstanceIds=[instance_id])

while True:
    state = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]['State']['Name']
    print("State:", state)
    if state == 'stopped':
        break
    time.sleep(5)

print("Starting Instance...")
ec2.start_instances(InstanceIds=[instance_id])

while True:
    state = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]['State']['Name']
    print("State:", state)
    if state == 'running':
        break
    time.sleep(5)

print("Migration Complete.")
